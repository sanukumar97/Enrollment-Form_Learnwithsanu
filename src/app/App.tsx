import { BrowserRouter, Routes, Route } from "react-router";
import { Toaster } from "sonner";
import { EnrollmentForm } from "./components/enrollment/EnrollmentForm";

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        richColors
        toastOptions={{
          style: {
            borderRadius: "14px",
            fontSize: "14px",
          },
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<EnrollmentForm />} />
        </Routes>
      </BrowserRouter>
    </>
  );
}
