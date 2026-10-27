import { useSelector } from "react-redux";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/languageContext";
import { useGetManualOrdersQuery, useReviewManualOrderMutation } from "@/features/api/purchaseApi";
import BrandedLoader from "@/components/BrandedLoader";

const ManualOrders = () => {
  const { t, language } = useLanguage();
  const isInstructor = useSelector((state) => state.auth.user?.role === "instructor");
  const [searchParams, setSearchParams] = useSearchParams();
  const pageValue = Number(searchParams.get("page") || 1);
  const page = Number.isSafeInteger(pageValue) && pageValue > 0 ? pageValue : 1;
  const status = searchParams.get("status") || "";
  const { data, isLoading, isError, refetch } = useGetManualOrdersQuery({ page, limit: 20, status });
  const [review, { isLoading: isReviewing }] = useReviewManualOrderMutation();
  const orders = data?.orders || [];
  const updateFilters = (nextStatus = status, nextPage = 1) => {
    const next = new URLSearchParams();
    if (nextStatus) next.set("status", nextStatus);
    if (nextPage > 1) next.set("page", String(nextPage));
    setSearchParams(next);
  };

  const handleReview = async (order, decision) => {
    const confirmation = decision === "approve"
      ? (language === "ar" ? "تأكد إن المبلغ وصلك فعلاً قبل فتح الكورس. تأكيد الدفع؟" : "Confirm that you received the payment before unlocking the course. Continue?")
      : (language === "ar" ? "هل تريد رفض هذا الطلب؟" : "Reject this order?");
    if (!window.confirm(confirmation)) return;
    try {
      await review({ orderId: order._id, decision }).unwrap();
      toast.success(language === "ar" ? "تم تحديث الطلب." : "Order updated.");
    } catch (error) {
      toast.error(error?.data?.message || (language === "ar" ? "تعذّر تحديث الطلب." : "Could not update the order."));
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="border-b border-border pb-5 dark:border-border">
        <h1 className="text-3xl font-bold">{t("orders")}</h1>
        <p className="mt-2 text-sm text-muted-foreground dark:text-muted-foreground">
          {isInstructor
            ? (language === "ar" ? "راجع التحويل بنفسك قبل تأكيد الدفع. المنصة لا تستلم الأموال نيابةً عنك." : "Check that you received the transfer before confirming. The platform does not collect funds for you.")
            : (language === "ar" ? "عرض طلبات المدرسين للمراجعة. تأكيد الدفع بيد صاحب الكورس فقط." : "Review instructor orders. Only the course owner can confirm payment.")}
        </p>
      </header>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
          <span className="me-2">{language === "ar" ? "الحالة" : "Status"}</span>
          <select value={status} onChange={(event) => updateFilters(event.target.value)} className="min-h-10 border border-border bg-card px-3 dark:border-border dark:bg-secondary">
            <option value="">{language === "ar" ? "كل الطلبات" : "All orders"}</option>
            <option value="pending">{language === "ar" ? "قيد الانتظار" : "Pending"}</option>
            <option value="completed">{language === "ar" ? "مؤكدة" : "Confirmed"}</option>
            <option value="failed">{language === "ar" ? "مرفوضة" : "Rejected"}</option>
          </select>
        </label>
        {data?.total != null && <span className="text-sm text-muted-foreground">{data.total} {language === "ar" ? "طلب" : "orders"}</span>}
      </div>
      {isLoading ? <BrandedLoader /> : isError ? (
        <div role="alert" className="rounded-xl border border-red-200 p-5">
          <p>{language === "ar" ? "تعذّر تحميل الطلبات." : "Could not load orders."}</p>
          <Button variant="outline" className="mt-3" onClick={() => refetch()}>{t("retry")}</Button>
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-border p-8 text-center dark:border-border">{language === "ar" ? "لا توجد طلبات بعد." : "No orders yet."}</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <article key={order._id} className="rounded-xl border border-border bg-card p-5 dark:border-border dark:bg-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{order.course?.courseTitle || (language === "ar" ? "كورس محذوف" : "Deleted course")}</h2>
                  <p className="mt-1 text-sm text-muted-foreground dark:text-muted-foreground">{order.student?.name || "—"} · {order.student?.email || "—"}</p>
                  {!isInstructor && <p className="text-sm text-muted-foreground">{t("instructor")}: {order.instructor?.name || "—"}</p>}
                  <p className="mt-2 text-xs text-muted-foreground">{language === "ar" ? "رقم الطلب" : "Reference"}: <span dir="ltr" className="font-mono">{order.reference}</span></p>
                </div>
                <div className="text-end">
                  <p className="font-bold">{order.amount} EGP</p>
                  <p className="mt-1 text-sm">{order.status === "pending" ? (language === "ar" ? "قيد الانتظار" : "Pending") : order.status === "completed" ? (language === "ar" ? "مؤكد" : "Confirmed") : (language === "ar" ? "مرفوض" : "Rejected")}</p>
                </div>
              </div>
              {isInstructor && order.status === "pending" && (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4 dark:border-border">
                  <Button disabled={isReviewing} onClick={() => handleReview(order, "approve")}>{t("approvePayment")}</Button>
                  <Button disabled={isReviewing} variant="outline" onClick={() => handleReview(order, "reject")}>{t("rejectOrder")}</Button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
      {!isLoading && !isError && data?.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-4" aria-label={language === "ar" ? "صفحات الطلبات" : "Order pages"}>
          <Button variant="outline" disabled={page <= 1} onClick={() => updateFilters(status, page - 1)}>{language === "ar" ? "السابق" : "Previous"}</Button>
          <span className="text-sm text-muted-foreground">{language === "ar" ? "صفحة" : "Page"} {page} / {data.totalPages}</span>
          <Button variant="outline" disabled={page >= data.totalPages} onClick={() => updateFilters(status, page + 1)}>{language === "ar" ? "التالي" : "Next"}</Button>
        </nav>
      )}
    </div>
  );
};

export default ManualOrders;
