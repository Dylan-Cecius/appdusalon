export type BillingUser = {
  id: string;
  email?: string | null;
};

export type BillingOwner = {
  salonId: string | null;
  ownerUserId: string;
  ownerEmail: string;
  isOwner: boolean;
};

export const resolveBillingOwner = async (
  admin: any,
  requester: BillingUser,
): Promise<BillingOwner> => {
  const requesterEmail = String(requester.email || "").trim().toLowerCase();
  if (!requesterEmail) throw new Error("billing_email_missing");

  // Prefer a salon actually owned by the requester. Legacy accounts can have
  // several membership rows (for example an older employee membership plus
  // their own salon), and billing must never attach to the wrong salon.
  const { data: ownedSalon, error: ownedSalonError } = await admin
    .from("salons")
    .select("id")
    .eq("owner_user_id", requester.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (ownedSalonError) throw ownedSalonError;

  let salonId = ownedSalon?.id || null;

  if (!salonId) {
    // For non-owners, mirror the application permission resolver: prefer an
    // admin membership, otherwise the oldest membership.
    const { data: memberships, error: membershipError } = await admin
      .from("user_roles")
      .select("salon_id, role, created_at")
      .eq("user_id", requester.id)
      .order("created_at", { ascending: true });

    if (membershipError) throw membershipError;

    const rows = memberships || [];
    const membership =
      rows.find((row: any) => row.role === "admin") ||
      rows[0] ||
      null;

    salonId = membership?.salon_id || null;
  }

  if (!salonId) {
    return {
      salonId: null,
      ownerUserId: requester.id,
      ownerEmail: requesterEmail,
      isOwner: true,
    };
  }

  const { data: salon, error: salonError } = await admin
    .from("salons")
    .select("owner_user_id")
    .eq("id", salonId)
    .maybeSingle();

  if (salonError) throw salonError;

  const ownerUserId = salon?.owner_user_id || requester.id;

  if (ownerUserId === requester.id) {
    return {
      salonId: String(salonId),
      ownerUserId,
      ownerEmail: requesterEmail,
      isOwner: true,
    };
  }

  const { data: ownerData, error: ownerError } =
    await admin.auth.admin.getUserById(ownerUserId);

  if (ownerError || !ownerData.user?.email) {
    throw new Error("billing_owner_not_found");
  }

  return {
    salonId: String(salonId),
    ownerUserId,
    ownerEmail: ownerData.user.email.toLowerCase(),
    isOwner: false,
  };
};
