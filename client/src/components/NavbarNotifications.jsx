import { useShellText, useShellFeedback } from "@/components/useShellText";
import { notificationText } from "@/lib/notificationText";
import { Bell } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import BrandedLoader from "./BrandedLoader";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { useGetCommentNotificationsQuery, useMarkAllCommentNotificationsAsReadMutation, useMarkCommentNotificationAsReadMutation } from "@/features/api/courseProgressApi";
import { useNavigate } from "react-router-dom";
import { authApi } from "@/features/api/authApi";
import { purchaseApi } from "@/features/api/purchaseApi";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { useLanguage } from "./languageContext";

const getNotificationTimeLabel = (createdAt, ui, language) => {
  const timestamp = new Date(createdAt).getTime();

  if (Number.isNaN(timestamp)) {
    return "";
  }

  const diffInMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60000));

  if (diffInMinutes < 1) {
    return ui("Just now");
  }

  if (diffInMinutes < 60) {
    return ui("{0}m ago", diffInMinutes);
  }

  const diffInHours = Math.round(diffInMinutes / 60);
  if (diffInHours < 24) {
    return ui("{0}h ago", diffInHours);
  }

  const diffInDays = Math.round(diffInHours / 24);
  if (diffInDays < 7) {
    return ui("{0}d ago", diffInDays);
  }

  return new Date(createdAt).toLocaleDateString(language === "ar" ? "ar-EG" : "en-GB");
};

const CommentNotifications = ({ user, compact = false }) => {
  const feedback = useShellFeedback();
  const ui = useShellText();
  const { language } = useLanguage();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const hasAuthToken = typeof window !== "undefined" && Boolean(window.localStorage.getItem("lms_auth_token"));
  const { data, isLoading, refetch } = useGetCommentNotificationsQuery(undefined, {
    skip: !user?._id || !hasAuthToken,
    pollingInterval: 15000,
    skipPollingIfUnfocused: true,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
  });
  const [markNotificationAsRead] = useMarkCommentNotificationAsReadMutation();
  const [markAllNotificationsAsRead, { isLoading: isMarkingAllNotifications }] =
    useMarkAllCommentNotificationsAsReadMutation();

  const notifications = useMemo(() => data?.notifications ?? [], [data?.notifications]);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );
  const notificationDescription = ui("Course discussions and order updates.");

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        refetch();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [refetch]);

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification?.isRead) {
        await markNotificationAsRead(notification._id).unwrap();
      }

      setOpen(false);

      if (notification?.type === "manual-order-approved") {
        dispatch(purchaseApi.util.invalidateTags(["PurchaseStatus"]));
        dispatch(authApi.util.invalidateTags(["CurrentUser"]));
      }

      if (notification?.link) {
        navigate(notification.link);
      }
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to update notification."), ui("Failed to update notification.")));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead().unwrap();
    } catch (error) {
      toast.error(feedback(error?.data?.message || ui("Failed to mark notifications as read."), ui("Failed to mark notifications as read.")));
    }
  };

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          refetch();
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={`relative rounded-full border-border bg-card/90 hover:bg-muted dark:border-border dark:bg-card dark:hover:bg-secondary ${
            compact ? "h-10 w-10" : "h-11 w-11"
          }`}
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">{ui("Notifications")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-[360px] rounded-3xl border border-border/80 bg-card/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card/95"
      >
        <DropdownMenuLabel className="rounded-2xl px-3 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground dark:text-foreground">{ui("Notifications")}</p>
              <p className="mt-1 text-xs font-normal text-muted-foreground dark:text-muted-foreground">
                {notificationDescription}
              </p>
            </div>
            {unreadCount > 0 && (
              <div className="flex items-center gap-2">
                <Badge className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground hover:bg-[#dff5eb] dark:bg-accent/10 dark:text-accent-foreground">
                  {unreadCount}{" "}{ui("new")}{" "}</Badge>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isMarkingAllNotifications}
                  onClick={handleMarkAllAsRead}
                  className="h-8 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
                >{" "}{ui("Mark all read")}{" "}</Button>
              </div>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {isLoading ? (
          <BrandedLoader variant="inline" className="w-full py-3" />
        ) : notifications.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground dark:text-muted-foreground">{" "}{ui("No notifications yet.")}{" "}</div>
        ) : (
          notifications.map((notification) => {
            return (
              <DropdownMenuItem
                key={notification._id}
                className={`rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary ${
                  notification.isRead ? "opacity-75" : ""
                }`}
                onSelect={(event) => {
                  event.preventDefault();
                  void handleNotificationClick(notification);
                }}
              >
                <div className="flex w-full items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      notification.isRead
                        ? "bg-muted text-muted-foreground dark:bg-secondary dark:text-muted-foreground"
                        : "bg-[#dff5eb] text-[#126252] dark:bg-accent/10 dark:text-accent-foreground"
                    }`}
                  >
                    <Bell className="h-4 w-4" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="line-clamp-2 text-sm font-semibold text-foreground dark:text-foreground">
                        {notificationText(notification, language)}
                      </p>
                      {!notification.isRead && (
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                      )}
                    </div>

                    <p className="mt-2 text-xs text-muted-foreground dark:text-muted-foreground">
                      {getNotificationTimeLabel(notification.createdAt, ui, language)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default CommentNotifications;
