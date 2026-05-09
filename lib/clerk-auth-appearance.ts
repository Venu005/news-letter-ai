/**
 * Merged with ClerkProvider in layout; pass again on SignIn/SignUp to flatten
 * nested card chrome inside our auth panel.
 */
export const clerkAuthPanelAppearance = {
  elements: {
    rootBox: "w-full",
    card: "shadow-none border-0 bg-transparent p-0 m-0",
    header: "hidden",
    headerTitle: "hidden",
    headerSubtitle: "hidden",
    socialButtonsRoot: "flex flex-col gap-3",
    socialButtonsBlockButton:
      "border border-black/10 bg-white text-[#0F172A] transition-colors duration-200 hover:bg-[#F8FAFC] cursor-pointer rounded-xl",
    dividerRow: "my-4 bg-black/10",
    formFieldRow: "gap-1.5",
    formFieldLabel: "text-[#0F172A] text-sm font-medium",
    formFieldInput:
      "rounded-xl border-black/12 bg-white text-[#0F172A] transition-colors duration-200 focus:border-[#0F172A]/40",
    formButtonPrimary:
      "w-full rounded-full bg-[#0F172A] text-white shadow-none transition-colors duration-200 hover:bg-[#0F172A]/90 cursor-pointer",
    footerAction: "mt-6",
    footerActionLink:
      "text-[#64748B] transition-colors duration-200 hover:text-[#0F172A] cursor-pointer font-medium",
    formFieldInputShowPasswordButton: "text-[#64748B] cursor-pointer",
    identityPreview: "rounded-xl border border-black/10",
    identityPreviewText: "text-[#0F172A]",
    identityPreviewEditButton: "text-[#64748B] cursor-pointer",
    alertText: "text-[#0F172A]",
    formResendCodeLink: "text-[#0F172A] cursor-pointer",
  },
} as const;
