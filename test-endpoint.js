async function testEndpoint() {
  try {
    const sesionId = 11; // De la consulta anterior
    const url = `http://localhost:3000/api/turnos?sesion_id=${sesionId}&ultimo_cerrado=true`;

    console.log("🌐 Probando endpoint:", url);
    console.log("");

    const response = await fetch(url);

    console.log("📡 Status:", response.status);
    console.log("📡 OK:", response.ok);
    console.log("");

    const data = await response.json();
    console.log("📦 Response data:");
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

testEndpoint();
