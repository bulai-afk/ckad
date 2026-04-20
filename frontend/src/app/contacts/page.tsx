import { permanentRedirect } from "next/navigation";

export default function ContactsPage() {
  permanentRedirect("/about");
}

