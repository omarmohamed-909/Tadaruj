import { Button } from "./ui/button";
import { MessageCircle } from "lucide-react";
import BrandedLoader from "./BrandedLoader";
import { toast } from "sonner";
import { useLanguage } from "@/components/languageContext";
import { useRequestManualOrderMutation } from "@/features/api/purchaseApi";

const BuyCourseButton = ({ courseId }) => {
  const { t } = useLanguage();
  const [requestOrder, { isLoading }] = useRequestManualOrderMutation();

  const handleOrder = async () => {
    // Open synchronously so popup blockers do not discard the WhatsApp tab after the API call.
    const tab = window.open("about:blank", "_blank");
    try {
      const response = await requestOrder(courseId).unwrap();
      if (tab) tab.location.href = response.whatsappUrl;
      else window.location.href = response.whatsappUrl;
      toast.success(`${t("orderCreated")} ${response.order.reference}. ${t("sendWhatsappReminder")}`);
    } catch (error) {
      tab?.close();
      toast.error(error?.data?.message || t("orderFailed"));
    }
  };

  return (
    <Button onClick={handleOrder} disabled={isLoading} className="flex w-full items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
      {isLoading ? <BrandedLoader variant="tiny" /> : <MessageCircle className="h-4 w-4" />}
      {isLoading ? t("creatingOrder") : t("requestOnWhatsapp")}
    </Button>
  );
};

export default BuyCourseButton;
