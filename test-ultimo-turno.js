const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function testUltimoTurno() {
  try {
    console.log("🔍 Buscando sesiones de caja...\n");

    // Buscar sesión abierta
    const sesiones = await prisma.sesiones_caja.findMany({
      where: { estado: "abierta" },
      select: {
        id: true,
        codigo_sesion: true,
        fecha_apertura: true,
      },
      take: 1,
    });

    if (sesiones.length === 0) {
      console.log("❌ No hay sesiones abiertas");
      return;
    }

    const sesion = sesiones[0];
    console.log("✅ Sesión encontrada:");
    console.log("   ID:", sesion.id);
    console.log("   Código:", sesion.codigo_sesion);
    console.log("");

    // Buscar todos los turnos de esta sesión
    console.log("🔍 Buscando turnos de la sesión...\n");
    const todosTurnos = await prisma.turnos_caja.findMany({
      where: { sesion_caja_id: sesion.id },
      select: {
        id: true,
        estado: true,
        efectivo_inicial: true,
        efectivo_final: true,
        fecha_inicio: true,
        fecha_fin: true,
        cajero: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
      orderBy: { fecha_inicio: "desc" },
    });

    console.log(`📊 Total de turnos: ${todosTurnos.length}\n`);
    todosTurnos.forEach((turno, index) => {
      console.log(`Turno ${index + 1}:`);
      console.log("   ID:", turno.id);
      console.log("   Estado:", turno.estado);
      console.log("   Cajero:", turno.cajero.nombre, turno.cajero.apellido);
      console.log("   Efectivo inicial:", turno.efectivo_inicial);
      console.log("   Efectivo final:", turno.efectivo_final);
      console.log("   Inicio:", turno.fecha_inicio);
      console.log("   Fin:", turno.fecha_fin);
      console.log("");
    });

    // Buscar último turno cerrado (como lo hace el API)
    console.log(
      "🔍 Buscando último turno CERRADO (efectivo_final not null)...\n"
    );
    const ultimoTurnoCerrado = await prisma.turnos_caja.findFirst({
      where: {
        sesion_caja_id: sesion.id,
        estado: "finalizado",
        efectivo_final: { not: null },
      },
      orderBy: {
        fecha_fin: "desc",
      },
      select: {
        id: true,
        efectivo_final: true,
        cajero: {
          select: {
            nombre: true,
            apellido: true,
          },
        },
      },
    });

    if (ultimoTurnoCerrado) {
      console.log("✅ Último turno cerrado encontrado:");
      console.log("   ID:", ultimoTurnoCerrado.id);
      console.log("   Efectivo final:", ultimoTurnoCerrado.efectivo_final);
      console.log(
        "   Cajero:",
        ultimoTurnoCerrado.cajero.nombre,
        ultimoTurnoCerrado.cajero.apellido
      );
      console.log("");
      console.log("📋 Datos que se enviarían al frontend:");
      console.log(JSON.stringify(ultimoTurnoCerrado, null, 2));
    } else {
      console.log("❌ No hay turnos cerrados con efectivo_final");
      console.log("   Esto significa que es el primer turno de la sesión");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testUltimoTurno();
