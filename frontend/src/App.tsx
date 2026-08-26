import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Dashboard from "@/pages/Dashboard";
import Doctors from "@/pages/Doctors";
import Patients from "@/pages/Patients";
import Appointments from "@/pages/Appointments";
import MedicalRecords from "@/pages/MedicalRecords";
import Prescriptions from "@/pages/Prescriptions";
import Certificates from "@/pages/Certificates";
import Specialties from "@/pages/Specialties";
import Insurance from "@/pages/Insurance";
import Users from "@/pages/Users";
import Availability from "@/pages/Availability";
import Audit from "@/pages/Audit";
import ClinicalAI from "@/pages/ClinicalAI";
import Login from "@/pages/Login";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { useAuth } from "./hooks/useAuth";

function AdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role !== 'ROLE_ADMIN') return <Redirect to="/" />;
  return <Component />;
}

function NonAdminRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role === 'ROLE_ADMIN') return <Redirect to="/users" />;
  if (user?.role === 'ROLE_AUDITOR' || user?.role === 'ROLE_GESTOR') return <Redirect to="/audit" />;
  return <Component />;
}

function AuditorRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role !== 'ROLE_AUDITOR' && user?.role !== 'ROLE_GESTOR') return <Redirect to="/" />;
  return <Component />;
}

function MedicoRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, user } = useAuth();
  if (!isAuthenticated) return <Redirect to="/login" />;
  if (user?.role !== 'ROLE_MEDICO') return <Redirect to="/" />;
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/" component={() => <NonAdminRoute component={Dashboard} />} />
      <Route path="/users" component={() => <AdminRoute component={Users} />} />
      <Route path="/doctors" component={() => <NonAdminRoute component={Doctors} />} />
      <Route path="/patients" component={() => <NonAdminRoute component={Patients} />} />
      <Route path="/appointments" component={() => <NonAdminRoute component={Appointments} />} />
      <Route path="/medical-records" component={() => <NonAdminRoute component={MedicalRecords} />} />
      <Route path="/prescriptions" component={() => <NonAdminRoute component={Prescriptions} />} />
      <Route path="/certificates" component={() => <NonAdminRoute component={Certificates} />} />
      <Route path="/specialties" component={() => <NonAdminRoute component={Specialties} />} />
      <Route path="/insurance" component={() => <NonAdminRoute component={Insurance} />} />
      <Route path="/availability" component={() => <NonAdminRoute component={Availability} />} />
      <Route path="/audit" component={() => <AuditorRoute component={Audit} />} />
      <Route path="/clinical-ai" component={() => <MedicoRoute component={ClinicalAI} />} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
