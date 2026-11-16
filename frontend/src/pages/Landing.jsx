import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import LandingContent from "./LandingContent";

export default function Landing() {
  const { user } = useAuth();
  return user ? <Navigate to="/app" replace /> : <LandingContent />;
}
