import { Suspense } from "react";
import { SignupForm } from "../components/signup/signup";

export default function Signup() {
    return (
        <Suspense fallback={null}>
            <SignupForm />
        </Suspense>
    );
}