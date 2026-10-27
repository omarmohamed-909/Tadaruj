import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import FailureState from "@/components/FailureState";

export default function RouteError() {
  const error = useRouteError();
  return <FailureState notFound={isRouteErrorResponse(error) && error.status === 404} />;
}
