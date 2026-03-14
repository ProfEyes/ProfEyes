import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://arkrjextwpwqhrvcijyr.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFya3JqZXh0d3B3cWhydmNpanlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg5MDM4OTUsImV4cCI6MjA4NDQ3OTg5NX0.qAmrahULxsyZsmwwSR1FbEclNMwLe-vnUeAvpxDTdkY"
);

console.log("\n🔧 Criando usuário de teste...\n");

const { data, error } = await supabase.auth.signUp({
  email: "igore.teste@outlook.com",
  password: "SuperSecure#Pass123!Word@2024",
  options: { data: { display_name: "Igor Teste" } }
});

if (error) {
  console.log("❌ Erro:", error.message);
} else {
  console.log("✅ SUCESSO!");
  console.log("📧 Email: igore.teste@outlook.com");
  console.log("👤 Nome: Igor Teste");
  console.log("\n💡 Digite 'igor' no autocompletar para encontrar!");
}
