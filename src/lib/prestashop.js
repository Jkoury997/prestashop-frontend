// lib/prestashop.js
import axios from "axios";

const PRESTASHOP_URL = process.env.PRESTASHOP_URL;
const WS_KEY = process.env.PRESTASHOP_WS_KEY;

if (!PRESTASHOP_URL || !WS_KEY) {
  console.warn("⚠️ Falta PRESTA_BASE_URL o PRESTA_API_KEY en .env.local");
}

// ------------------ Helpers de fecha ------------------
export function formatDate(date) {
  return date.toISOString().slice(0, 10); // YYYY-MM-DD
}

// ------------------ Órdenes en rango ------------------
export async function getOrdersInRange(from, to, limitPerPage = 300) {
  console.log(`Cargando órdenes desde ${from} hasta ${to}...`);
  const orders = [];
  let offset = 0;
  let seguir = true;

  while (seguir) {
    const url = `${PRESTASHOP_URL}/orders`;

    const { data } = await axios.get(url, {
      params: {
        ws_key: WS_KEY,
        output_format: "JSON",
        "filter[date_add]": `[${from},${to}]`,
        date: 1,
        display: "[id,id_customer,date_add,total_paid]",
        limit: `${offset},${limitPerPage}`,
      },
    });

    const batch = data.orders || [];

    if (batch.length === 0) {
      seguir = false;
    } else {
      orders.push(...batch);
      offset += limitPerPage;
      console.log(`Órdenes cargadas: ${orders.length}`);
    }
  }

  return orders;
}

// ------------------ Clientes (activos / no guest) ------------------
async function getAllCustomers(limitPerPage = 300) {

  console.log("Cargando todos los clientes activos...");
  const customers = [];
  let offset = 0;
  let seguir = true;

  while (seguir) {
    const url = `${PRESTASHOP_URL}/customers`;

    const { data } = await axios.get(url, {
      params: {
        ws_key: WS_KEY,
        output_format: "JSON",
        "filter[is_guest]": "[0]",
        "filter[active]": "[1]",
        display: "[id,firstname,lastname,email,date_add,id_default_group]",
        limit: `${offset},${limitPerPage}`,
      },
    });

    const batch = data.customers || [];

    if (batch.length === 0) {
      seguir = false;
    } else {
      customers.push(...batch);
      offset += limitPerPage;
      console.log(`Clientes cargados: ${customers.length}`);
    }
  }

  return customers;
}

// ------------------ Grupos (tipo de cliente) ------------------
async function getGroupsMap() {
  const url = `${PRESTASHOP_URL}/groups`;

  const { data } = await axios.get(url, {
    params: {
      ws_key: WS_KEY,
      output_format: "JSON",
      display: "[id,name]",
    },
  });

  const groups = data.groups || [];
  const map = {};

  for (const g of groups) {
    const id = parseInt(g.id, 10);
    if (!id) continue;

    let name = "";

    if (typeof g.name === "string") {
      name = g.name;
    } else if (Array.isArray(g.name) && g.name.length > 0) {
      name = g.name[0].value || g.name[0];
    } else if (g.name && g.name.language) {
      const langs = Array.isArray(g.name.language)
        ? g.name.language
        : [g.name.language];
      name = langs[0].value || "";
    }

    map[id] = name || `Grupo ${id}`;
  }

  return map;
}

// ------------------ Provincias (states) ------------------
async function getStatesMap() {
  const url = `${PRESTASHOP_URL}/states`;

  const { data } = await axios.get(url, {
    params: {
      ws_key: WS_KEY,
      output_format: "JSON",
      display: "[id,name]",
    },
  });

  const states = data.states || [];
  const map = {};

  for (const s of states) {
    const id = parseInt(s.id, 10);
    if (!id) continue;

    let name = "";

    if (typeof s.name === "string") {
      name = s.name;
    } else if (Array.isArray(s.name) && s.name.length > 0) {
      name = s.name[0].value || s.name[0];
    } else if (s.name && s.name.language) {
      const langs = Array.isArray(s.name.language)
        ? s.name.language
        : [s.name.language];
      name = langs[0].value || "";
    }

    map[id] = name || `State ${id}`;
  }

  return map;
}

// ------------------ Direcciones (teléfono + provincia por cliente) ------------------
async function getAddressesByCustomer(statesMap, limitPerPage = 300) {
  const addressesByCustomer = {};
  let offset = 0;
  let seguir = true;

  while (seguir) {
    const url = `${PRESTASHOP_URL}/addresses`;

    const { data } = await axios.get(url, {
      params: {
        ws_key: WS_KEY,
        output_format: "JSON",
        "filter[deleted]": "[0]",
        display: "[id,id_customer,id_state,phone,phone_mobile]",
        limit: `${offset},${limitPerPage}`,
      },
    });

    const batch = data.addresses || [];

    if (batch.length === 0) {
      seguir = false;
    } else {
      for (const a of batch) {
        const cid = parseInt(a.id_customer, 10);
        if (!cid) continue;

        const stateId = parseInt(a.id_state, 10);
        const provinceName = statesMap[stateId] || "";

        const phone =
          (a.phone_mobile && a.phone_mobile.trim()) ||
          (a.phone && a.phone.trim()) ||
          "";

        addressesByCustomer[cid] = {
          phone,
          province: provinceName,
        };
      }

      offset += limitPerPage;
      console.log(`Direcciones procesadas (aprox): ${offset}`);
    }
  }

  return addressesByCustomer;
}

const PAID_STATES = [2, 3, 4, 5, 11, 16, 23]; // 👈 tus estados pagados

export async function getPaidOrdersInRange(from, to, limitPerPage = 300) {
  console.log(`Cargando órdenes PAGAS desde ${from} hasta ${to}...`);

  const orders = [];
  let offset = 0;
  let seguir = true;

  // Armo filtro tipo [2|3|4|5|11|16|23]
  const paidStatesFilter = `[${PAID_STATES.join("|")}]`;

  while (seguir) {
    const url = `${PRESTASHOP_URL}/orders`;

    const { data } = await axios.get(url, {
      params: {
        ws_key: WS_KEY,
        output_format: "JSON",
        "filter[date_add]": `[${from},${to}]`,
        "filter[current_state]": paidStatesFilter, // 👉 filtro por estados pagados
        date: 1,
        display: "[id,id_customer,current_state,total_paid,date_add]", 
        limit: `${offset},${limitPerPage}`,
      },
    });

    const batch = data.orders || [];

    if (batch.length === 0) {
      seguir = false;
    } else {
      orders.push(...batch);
      offset += limitPerPage;
      console.log(`Órdenes cargadas: ${orders.length}`);
    }
  }

  return orders;
}

// ------------------ Core: obtener clientes objetivo ------------------
export async function getClientesObjetivo() {
  if (!PRESTASHOP_URL || !WS_KEY) {
    throw new Error("Faltan PRESTASHOP_URL o PRESTASHOP_WS_KEY en el .env");
  }

  const today = new Date();


  const fourMonthsAgo = new Date(today);
  fourMonthsAgo.setMonth(today.getMonth() - 4); // últimos 4 meses

  const lastMonthStart = new Date(today);
  lastMonthStart.setMonth(today.getMonth() - 1); // inicio del último mes

  const from4 = formatDate(fourMonthsAgo);
  const toToday = formatDate(today);

  console.log("Desde fechas:", { from4, toToday });

  console.log(
    `Buscando órdenes desde ${from4} hasta ${toToday} (últimos 4 meses)...`
  );

  const [orders, customers, groupsMap, statesMap] = await Promise.all([
    getPaidOrdersInRange(from4, toToday),
    getAllCustomers(),
    getGroupsMap(),
    getStatesMap(),
  ]);

  console.log("Cargando direcciones (teléfono + provincia)...");
  const addressesByCustomer = await getAddressesByCustomer(statesMap);

  const lastOrderDate = {};
  const totalAmountLast4 = {};
  const ordersCountLast4 = {};

  for (const o of orders) {
    const cid = parseInt(o.id_customer, 10);
    if (!cid) continue;

    const date = new Date(o.date_add);
    const amount = parseFloat(o.total_paid) || 0;

    if (!lastOrderDate[cid] || date > new Date(lastOrderDate[cid])) {
      lastOrderDate[cid] = o.date_add;
    }

    totalAmountLast4[cid] = (totalAmountLast4[cid] || 0) + amount;
    ordersCountLast4[cid] = (ordersCountLast4[cid] || 0) + 1;
  }

  console.log("Filtrando clientes objetivo...");

  const clientesObjetivo = customers.filter((c) => {
    const id = parseInt(c.id, 10);
    const last = lastOrderDate[id] ? new Date(lastOrderDate[id]) : null;

    if (!last) return false; // no compró en los últimos 4 meses
    if (last < fourMonthsAgo) return false; // última compra fuera de la ventana
    return last < lastMonthStart; // NO compró en el último mes
  });

  console.log(`Clientes objetivo: ${clientesObjetivo.length}`);

  const jsonData = clientesObjetivo.map((c) => {
    const id = parseInt(c.id, 10);
    const groupId = parseInt(c.id_default_group, 10);
    const tipoCliente = groupsMap[groupId] || `Grupo ${groupId}`;

    const address = addressesByCustomer[id] || {};
    const phone = address.phone || "";
    const province = address.province || "";

    return {
      id: c.id,
      firstname: c.firstname,
      lastname: c.lastname,
      email: c.email,
      customer_type: tipoCliente,
      phone,
      province,
      last_order: lastOrderDate[id] || null,
      orders_count_last_4_months: ordersCountLast4[id] || 0,
      total_amount_last_4_months: Number(
        (totalAmountLast4[id] || 0).toFixed(2)
      ),
    };
  });

  return jsonData;
}

/**
 * Llamado genérico al Webservice de PrestaShop
 * @param {string} resource - Ej: "products", "orders", "order_details", "categories"
 * @param {object} params - Filtros extra para la query
 */
export async function prestaFetch(resource, params = {}) {
  const url = new URL(`${PRESTASHOP_URL}/${resource}`);

  url.searchParams.set("output_format", "JSON");
  url.searchParams.set("ws_key", WS_KEY);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  console.log("🔍 Presta URL:", url.toString()); // 👈 AGREGADO

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Error Presta ${resource}: ${res.status} - ${text}`);
  }

  return res.json();
}

