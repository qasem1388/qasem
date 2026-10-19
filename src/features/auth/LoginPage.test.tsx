import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const invoke = vi.fn();
vi.mock("@tauri-apps/api/core", () => ({ invoke: (...a: unknown[]) => invoke(...a) }));

import { AuthProvider, useAuth } from "@/app/auth";
import { ThemeProvider } from "@/app/theme";
import { I18nProvider } from "@/shared/i18n";
import { LoginPage } from "./LoginPage";

function Harness() {
  const { user } = useAuth();
  return user ? <p>مرحبًا {user.fullName}</p> : <LoginPage companyName="مؤسسة النخبة" version="0.1.0" />;
}

function renderLogin() {
  return render(
    <I18nProvider lang="ar">
      <ThemeProvider>
        <AuthProvider>
          <Harness />
        </AuthProvider>
      </ThemeProvider>
    </I18nProvider>,
  );
}

describe("<LoginPage>", () => {
  beforeEach(() => {
    invoke.mockReset();
    (window as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
  });

  it("renders in Arabic and validates empty fields locally", async () => {
    renderLogin();
    expect(screen.getByRole("heading", { name: "تسجيل الدخول" })).toBeInTheDocument();
    expect(screen.getByText("مؤسسة النخبة")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
    expect(screen.getAllByText("هذا الحقل مطلوب")).toHaveLength(2);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("shows the Arabic backend error for bad credentials", async () => {
    invoke.mockRejectedValue({ code: "invalid_credentials", message: "x" });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/اسم المستخدم/), "admin");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "wrong-pass-1");
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
    expect(await screen.findByText("اسم المستخدم أو كلمة المرور غير صحيحة")).toBeInTheDocument();
    expect(invoke).toHaveBeenCalledWith("auth_login", { input: { username: "admin", password: "wrong-pass-1" } });
  });

  it("shows lockout minutes", async () => {
    invoke.mockRejectedValue({ code: "account_locked", message: "x", minutes_remaining: 12 });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/اسم المستخدم/), "admin");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "wrong-pass-1");
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
    expect(await screen.findByText(/حاول بعد 12 دقيقة/)).toBeInTheDocument();
  });

  it("enters the app on success", async () => {
    invoke.mockResolvedValue({
      token: "t",
      user: { id: "1", username: "admin", fullName: "مدير النظام", role: "admin", permissions: [] },
    });
    renderLogin();
    await userEvent.type(screen.getByLabelText(/اسم المستخدم/), "admin");
    await userEvent.type(screen.getByLabelText(/^كلمة المرور/), "Strong#Pass2026");
    await userEvent.click(screen.getByRole("button", { name: "دخول" }));
    expect(await screen.findByText("مرحبًا مدير النظام")).toBeInTheDocument();
  });
});
