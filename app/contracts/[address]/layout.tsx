import { ContractProvider } from "@/lib/frontend/contract-context";
import { Navbar } from "@/components/navbar";

export default function ContractLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ContractProvider>
      <div className="min-h-screen bg-background">
        <Navbar />
        {children}
      </div>
    </ContractProvider>
  );
}
