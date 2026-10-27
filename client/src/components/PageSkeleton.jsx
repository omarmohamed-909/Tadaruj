import React from "react";
import BrandedLoader from "./BrandedLoader";

const PageSkeleton = ({ variant = "default" }) => (
  <BrandedLoader variant={variant === "fullPage" ? "fullPage" : variant === "default" || variant === "form" ? "section" : "page"} />
);

const ListSkeleton = () => <BrandedLoader variant="section" />;

export { ListSkeleton };
export default PageSkeleton;
