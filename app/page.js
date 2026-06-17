import CRMManager from "@/components/CRMManager";
import AuthGate from "@/components/AuthGate";

export default function Home() {
  return (
    <AuthGate>
      <CRMManager />
    </AuthGate>
  );
}
