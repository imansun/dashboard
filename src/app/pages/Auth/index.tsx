// src/app/pages/Auth/index.tsx
// Import Dependencies
import { Link, useLocation, useNavigate } from "react-router";
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import { yupResolver } from "@hookform/resolvers/yup";
import { useForm } from "react-hook-form";
import { useMemo, useState } from "react";

// Local Imports
import Logo from "@/assets/appLogo.svg?react";
import { Button, Card, Checkbox, Input, InputErrorMsg } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { AuthFormValues, schema } from "./schema";
import { Page } from "@/components/shared/Page";
import { REDIRECT_URL_KEY } from "@/constants/app";
import { HttpError } from "@/app/services/http";

// ----------------------------------------------------------------------

export default function SignIn() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, errorMessage: authErrorMessage, isLoading } = useAuthContext();

  const [localErrorMessage, setLocalErrorMessage] = useState<string>("");

  const redirectTo = useMemo(() => {
    const raw = new URLSearchParams(location.search).get(REDIRECT_URL_KEY);
    const decoded = raw ? decodeURIComponent(raw) : "/dashboards/home";

    // جلوگیری از open-redirect (فقط مسیرهای داخلی)
    if (!decoded.startsWith("/") || decoded.startsWith("//")) return "/dashboards/home";

    return decoded;
  }, [location.search]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    resolver: yupResolver(schema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: AuthFormValues) => {
    setLocalErrorMessage("");
    try {
      await login({
        username: data.username.trim(),
        password: data.password,
      });

      navigate(redirectTo, { replace: true });
    } catch (e: any) {
      // پیام اصلی خطا توسط context ست می‌شود؛
      // اینجا فقط برای خطاهای غیر HttpError یک fallback می‌گذاریم
      if (e instanceof HttpError) {
        setLocalErrorMessage("");
        return;
      }
      setLocalErrorMessage(e?.message || "خطا در ورود");
    }
  };

  const shownError = localErrorMessage || authErrorMessage || "";

  return (
    <Page title="ورود">
      <main className="min-h-100vh grid w-full grow grid-cols-1 place-items-center">
        <div className="w-full max-w-[26rem] p-4 sm:px-5">
          <div className="text-center">
            <Logo className="mx-auto size-16" />
            <div className="mt-4">
              <h2 className="dark:text-dark-100 text-2xl font-semibold text-gray-600">
                خوش آمدید
              </h2>
              <p className="dark:text-dark-300 text-gray-400">
                لطفاً برای ادامه وارد شوید
              </p>
            </div>
          </div>

          <Card className="mt-5 rounded-lg p-5 lg:p-7">
            <form onSubmit={handleSubmit(onSubmit)} autoComplete="off">
              <div className="space-y-4">
                <Input
                  label="نام کاربری"
                  placeholder="نام کاربری خود را وارد کنید"
                  prefix={
                    <EnvelopeIcon
                      className="size-5 transition-colors duration-200"
                      strokeWidth="1"
                    />
                  }
                  {...register("username")}
                  error={errors?.username?.message}
                />

                <Input
                  label="رمز عبور"
                  placeholder="رمز عبور خود را وارد کنید"
                  type="password"
                  prefix={
                    <LockClosedIcon
                      className="size-5 transition-colors duration-200"
                      strokeWidth="1"
                    />
                  }
                  {...register("password")}
                  error={errors?.password?.message}
                />
              </div>

              <div className="mt-2">
                <InputErrorMsg when={!!shownError}>{shownError}</InputErrorMsg>
              </div>

              <div className="mt-4 flex items-center justify-between space-x-2">
                <Checkbox label="مرا به خاطر بسپار" />
                <a
                  href="##"
                  className="dark:text-dark-300 dark:hover:text-dark-100 dark:focus:text-dark-100 text-xs text-gray-400 transition-colors hover:text-gray-800 focus:text-gray-800"
                >
                  رمز عبور را فراموش کرده‌اید؟
                </a>
              </div>

              <Button
                type="submit"
                className="mt-5 w-full"
                color="primary"
                disabled={isSubmitting || isLoading}
              >
                {isSubmitting || isLoading ? "در حال ورود..." : "ورود"}
              </Button>
            </form>

            <div className="text-xs-plus mt-4 text-center">
              <p className="line-clamp-1">
                <span>حساب کاربری ندارید؟</span>{" "}
                <Link
                  className="text-primary-600 hover:text-primary-800 dark:text-primary-400 dark:hover:text-primary-600 transition-colors"
                  to="/pages/sign-up-v1"
                >
                  ایجاد حساب
                </Link>
              </p>
            </div>

            <div className="my-7 flex items-center space-x-3 text-xs rtl:space-x-reverse">
              <div className="dark:bg-dark-500 h-px flex-1 bg-gray-200"></div>
              <p>یا</p>
              <div className="dark:bg-dark-500 h-px flex-1 bg-gray-200"></div>
            </div>

            <div className="flex gap-4">
              <Button className="h-10 flex-1 gap-3" variant="outlined">
                <img className="size-5.5" src="/images/logos/google.svg" alt="لوگو" />
                <span>گوگل</span>
              </Button>
              <Button className="h-10 flex-1 gap-3" variant="outlined">
                <img className="size-5.5" src="/images/logos/github.svg" alt="لوگو" />
                <span>گیت‌هاب</span>
              </Button>
            </div>
          </Card>

          <div className="dark:text-dark-300 mt-8 flex justify-center text-xs text-gray-400">
            <a href="##">اعلان حریم خصوصی</a>
            <div className="dark:bg-dark-500 mx-2.5 my-0.5 w-px bg-gray-200"></div>
            <a href="##">شرایط سرویس</a>
          </div>
        </div>
      </main>
    </Page>
  );
}
