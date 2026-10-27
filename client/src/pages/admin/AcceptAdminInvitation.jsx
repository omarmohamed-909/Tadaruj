import React from "react";
import { useParams, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAcceptAdminInvitationMutation } from "@/features/api/authApi";
import { useLanguage } from "@/components/languageContext";

const AcceptAdminInvitation = () => {
  const { token } = useParams();
  const { user } = useSelector((state) => state.auth);
  const { t } = useLanguage();
  const [accept, { isLoading, isSuccess, error }] = useAcceptAdminInvitationMutation();
  return <main className="mx-auto max-w-xl px-5 py-20">
    <p className="text-sm font-semibold uppercase tracking-widest text-teal-700">{t("brandName")} administration</p>
    <h1 className="mt-3 text-3xl font-bold">Admin invitation</h1>
    {!user ? <p className="mt-6">Sign in with the invited email, then return to this link.</p> : <p className="mt-6">Signed in as {user.email}. Accept only if this is the invited account.</p>}
    {error && <p role="alert" className="mt-4 text-red-700">{error.data?.message || "Could not accept the invitation."}</p>}
    {isSuccess ? <Link className="mt-6 inline-block underline" to="/admin/dashboard">Open admin dashboard</Link> : <button type="button" disabled={!user || isLoading} onClick={() => accept(token)} className="mt-6 rounded-lg bg-teal-700 px-5 py-3 font-semibold text-white disabled:opacity-50">{isLoading ? "Accepting…" : "Accept invitation"}</button>}
  </main>;
};

export default AcceptAdminInvitation;
