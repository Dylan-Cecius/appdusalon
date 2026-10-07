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

  const { data: membership, error: membershipError } = await admin
    .from("user_roles")
    .select("salon_id, role, created_at")
    .eq("user_id", requester.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;

  let salonId = membership?.salon_id || null;

  if (!salonId) {
    const { data: ownedSalon, error: ownedSalonError } = await admin
      .from("salons")
      .select("id")
      .eq("owner_user_id", requester.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (ownedSalonError) throw ownedSalonError;
    salonId = ownedSalon?.id || null;
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
