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

  const { data: salonId, error: salonIdError } = await admin.rpc(
    "get_user_salon_id",
    { _user_id: requester.id },
  );

  if (salonIdError) throw salonIdError;

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
