import { db, initDatabase } from './db.js';

console.log('--- EXECUTANDO MIGRATION DE PLANOS (PRATA 49,90 / OURO 79,90) ---');
initDatabase();

// Desativar planos antigos e garantir apenas Prata e Ouro ativos
db.prepare("UPDATE plans SET active = 0 WHERE name NOT IN ('Prata', 'Ouro')").run();

// Atualizar valores exatos
db.prepare("UPDATE plans SET price_monthly = 49.90, price_yearly = 49.90, active = 1 WHERE name = 'Prata'").run();
db.prepare("UPDATE plans SET price_monthly = 79.90, price_yearly = 79.90, active = 1 WHERE name = 'Ouro'").run();

// Vincular tenants a plano Ouro caso estejam com plano inativo
const ouro = db.prepare("SELECT id FROM plans WHERE name = 'Ouro'").get() as any;
if (ouro) {
  db.prepare("UPDATE companies SET plan_id = ? WHERE plan_id NOT IN (SELECT id FROM plans WHERE name IN ('Prata', 'Ouro'))").run(ouro.id);
}

const activePlans = db.prepare("SELECT id, name, price_monthly, price_yearly, active, description FROM plans WHERE active = 1").all();
console.log('Planos Ativos no Banco de Dados:', JSON.stringify(activePlans, null, 2));
