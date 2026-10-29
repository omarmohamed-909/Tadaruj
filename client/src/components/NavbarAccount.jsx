import { useShellText } from "@/components/useShellText";
import { BadgeCheck, BookOpen, House, LogOut, UserCircle2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Link } from "react-router-dom";
import { useLanguage } from "./languageContext";

export default function NavbarAccount({ user, logoutHandler }) { const { t } = useLanguage(); const ui = useShellText(); return (<DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer ring-2 ring-transparent transition hover:ring-slate-200 dark:hover:ring-slate-700">
                  <AvatarImage
                    src={user?.photoUrl || "/default-avatar.webp"}
                    alt={t("profile")}
                  />
                  <AvatarFallback>{user?.name?.trim()?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-72 rounded-3xl border border-border/80 bg-card/95 p-2 shadow-[0_24px_60px_-30px_rgba(15,23,42,0.35)] dark:border-border dark:bg-card/95">
                <DropdownMenuLabel className="rounded-2xl px-3 py-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 ring-2 ring-slate-100 dark:ring-slate-800">
                      <AvatarImage
                        src={user?.photoUrl || "/default-avatar.webp"}
                        alt={ui("profile avatar")}
                      />
                      <AvatarFallback className="bg-[#dff5eb] font-semibold text-[#126252] dark:bg-teal-400/15 dark:text-teal-200">{user?.name?.trim()?.charAt(0).toUpperCase() || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground dark:text-foreground">
                        {user?.name}
                      </p>
                      <p className="truncate text-xs font-normal text-muted-foreground dark:text-muted-foreground">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                    <Link to="/" className="flex w-full items-center gap-3 font-medium">
                      <House className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                      {t("home")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                    <Link to="my-learning" className="flex w-full items-center gap-3 font-medium">
                      <BookOpen className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                      {t("learning")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                    <Link to="profile" className="flex w-full items-center gap-3 font-medium">
                      <UserCircle2 className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                      {t("profile")}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={logoutHandler}
                    className="rounded-2xl px-3 py-3 font-medium focus:bg-muted dark:focus:bg-secondary"
                  >
                    <LogOut className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                    {t("logout")}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                {["instructor", "admin"].includes(user?.role) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="rounded-2xl px-3 py-3 focus:bg-muted dark:focus:bg-secondary">
                      <Link to={user?.role === "admin" ? "/admin/dashboard" : "/instructor/dashboard"} className="flex w-full items-center gap-3 font-medium">
                        <BadgeCheck className="h-4 w-4 text-[#126252] dark:text-teal-300" />
                        {t("dashboard")}
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>); }
