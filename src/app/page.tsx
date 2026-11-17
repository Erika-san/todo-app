// トップ(/)。通常は proxy が先に振り分けるので、ここは念のための転送だけ
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/tasks");
}
