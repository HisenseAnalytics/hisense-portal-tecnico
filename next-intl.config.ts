import { notFound } from "next/navigation"
import { getRequestConfig } from "next-intl/server"
import { cookies } from "next/headers"

export default getRequestConfig(async () => {
  const cookieStore = cookies()
  const locale = cookieStore.get("language")?.value || "es"

  if (!["es", "pt"].includes(locale)) notFound()

  return {
    locale,
    messages: (await import(`./src/messages/${locale}.json`)).default,
  }
})