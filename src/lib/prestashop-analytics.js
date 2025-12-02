// lib/prestashop-analytics.js
import { getOrdersInRange, prestaFetch, formatDate } from "./prestashop";

/**
 * Órdenes + detalles de los últimos X días
 * Usa getOrdersInRange (que ya sabés que funciona)
 * y después trae los order_details filtrando por id_order.
 *
 * @return { orders: [], orderDetails: [] }
 */
export async function getOrdersWithDetailsLastDays(days = 30) {
  const today = new Date();
  const fromDate = new Date(today.getTime() - days * 24 * 60 * 60 * 1000);

  const from = formatDate(fromDate); // YYYY-MM-DD
  const to = formatDate(today);      // YYYY-MM-DD

  // 1) Órdenes en el rango (ya probado con axios en 1.7.5.2)
  const orders = await getOrdersInRange(from, to);

  if (!orders.length) {
    return { orders: [], orderDetails: [] };
  }

  // 2) Todos los IDs de órdenes
  const orderIds = orders.map((o) => o.id).filter(Boolean);

  // Evitamos peticiones locas
  if (!orderIds.length) {
    return { orders, orderDetails: [] };
  }

  // 3) Traemos los detalles filtrando por id_order
  const idsFilter = `[${orderIds.join("|")}]`;

  const detailsData = await prestaFetch("order_details", {
    "filter[id_order]": idsFilter,
    display: "full",
  });

  const orderDetails = detailsData?.order_details || [];

  return { orders, orderDetails };
}

/**
 * 🟣 A) Top ventas (últimos X días)
 */
export async function getTopProducts({ days = 30, limit = 10 } = {}) {
  const { orderDetails } = await getOrdersWithDetailsLastDays(days);

  const productMap = new Map();

  for (const detail of orderDetails) {
    const pid = detail.product_id;
    const quantity = Number(detail.product_quantity) || 0;
    const total = Number(detail.total_price_tax_incl) || 0;

    if (!productMap.has(pid)) {
      productMap.set(pid, {
        product_id: pid,
        product_attribute_id: detail.product_attribute_id,
        name: detail.product_name,
        total_qty: 0,
        total_revenue: 0,
      });
    }

    const current = productMap.get(pid);
    current.total_qty += quantity;
    current.total_revenue += total;
  }

  const arr = Array.from(productMap.values());
  arr.sort((a, b) => b.total_revenue - a.total_revenue);

  return arr.slice(0, limit);
}

/**
 * 🟣 A) Top productos por categoría
 * Devuelve un índice { categoryId: [productosTop10] }
 */
export async function getTopProductsByCategory({ days = 30, limit = 10 } = {}) {
  const top = await getTopProducts({ days, limit: 1000 }); // grande y después filtramos
  const productsData = await prestaFetch("products", {
    display: "full",
  });

  const products = productsData?.products || [];

  const productToCategories = new Map();

  for (const p of products) {
    const pid = String(p.id);
    const catIds =
      p.associations?.categories?.map((c) => String(c.id)) || [];
    productToCategories.set(pid, catIds);
  }

  const catMap = new Map();

  for (const item of top) {
    const pid = String(item.product_id);
    const cats = productToCategories.get(pid) || [];

    for (const cid of cats) {
      if (!catMap.has(cid)) {
        catMap.set(cid, []);
      }
      catMap.get(cid).push(item);
    }
  }

  // recortamos top N por categoría
  const result = {};
  for (const [cid, list] of catMap.entries()) {
    result[cid] = list
      .slice()
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit);
  }

  return result;
}

/**
 * 🟣 B) Productos sin ventas en los últimos X días ("dead stock")
 */
export async function getDeadStock({ days = 60 } = {}) {
  const productsData = await prestaFetch("products", {
    display: "full",
  });
  const products = productsData?.products || [];

  const { orderDetails } = await getOrdersWithDetailsLastDays(days);

  const soldProductIds = new Set(
    orderDetails.map((d) => String(d.product_id))
  );

  const dead = products.filter((p) => !soldProductIds.has(String(p.id)));

  return dead;
}

/**
 * 🟣 B) Dead stock por tienda (si usás multitienda / stock_availables)
 */
export async function getDeadStockByShop({ days = 60 } = {}) {
  const deadProducts = await getDeadStock({ days });

  // Si necesitás por tienda, hay que cruzar con stock_availables
  const deadIds = deadProducts.map((p) => String(p.id));
  if (!deadIds.length) return [];

  const idsFilter = `[${deadIds.join("|")}]`;
  const stockData = await prestaFetch("stock_availables", {
    "filter[id_product]": idsFilter,
    display: "full",
  });

  const stock = stockData?.stock_availables || [];

  return stock.map((s) => ({
    product_id: s.id_product,
    id_product_attribute: s.id_product_attribute,
    id_shop: s.id_shop,
    quantity: s.quantity,
  }));
}

/**
 * 🟣 D) Rotación por categoría (cantidad vendida y facturación por categoría)
 */
export async function getRotationByCategory({ days = 30 } = {}) {
  const { orderDetails } = await getOrdersWithDetailsLastDays(days);
  const productsData = await prestaFetch("products", {
    display: "full",
  });
  const categoriesData = await prestaFetch("categories", {
    display: "full",
  });

  const products = productsData?.products || [];
  const categories = categoriesData?.categories || [];

  const productToCategories = new Map();
  for (const p of products) {
    const pid = String(p.id);
    const catIds =
      p.associations?.categories?.map((c) => String(c.id)) || [];
    productToCategories.set(pid, catIds);
  }

  const catInfo = new Map();
  for (const c of categories) {
    const id = String(c.id);

    // Soporte multi-idioma típico de Presta 1.7.5.2
    let name = "";
    if (Array.isArray(c.name) && c.name.length > 0) {
      name = c.name[0]?.value || c.name[0];
    } else if (typeof c.name === "string") {
      name = c.name;
    } else if (c.name && c.name.language) {
      const langs = Array.isArray(c.name.language)
        ? c.name.language
        : [c.name.language];
      name = langs[0]?.value || "";
    }

    catInfo.set(id, {
      id,
      name: name || `Cat ${id}`,
      total_qty: 0,
      total_revenue: 0,
    });
  }

  for (const detail of orderDetails) {
    const pid = String(detail.product_id);
    const qty = Number(detail.product_quantity) || 0;
    const revenue = Number(detail.total_price_tax_incl) || 0;
    const cats = productToCategories.get(pid) || [];

    for (const cid of cats) {
      if (!catInfo.has(cid)) continue;
      const c = catInfo.get(cid);
      c.total_qty += qty;
      c.total_revenue += revenue;
    }
  }

  return Array.from(catInfo.values()).filter(
    (c) => c.total_qty > 0 || c.total_revenue > 0
  );
}

/**
 * 🟣 E) Rotación por atributo (talle / color / estilo / material)
 * IMPORTANTE: depende cómo tengas configurados los attributes / features
 */
export async function getRotationByAttribute({ days = 30 } = {}) {
  const { orderDetails } = await getOrdersWithDetailsLastDays(days);

  // Nota: acá asumimos que en order_details viene info de atributo en el nombre.
  // Para algo más fino, habría que ir contra product_attribute / product_option_value.
  const attributeMap = new Map();

  for (const detail of orderDetails) {
    const name = detail.product_name || "";
    const qty = Number(detail.product_quantity) || 0;
    const revenue = Number(detail.total_price_tax_incl) || 0;

    const attrId = String(detail.product_attribute_id || "0");

    if (!attributeMap.has(attrId)) {
      attributeMap.set(attrId, {
        product_id: detail.product_id,
        product_attribute_id: attrId,
        name,
        total_qty: 0,
        total_revenue: 0,
      });
    }

    const a = attributeMap.get(attrId);
    a.total_qty += qty;
    a.total_revenue += revenue;
  }

  return Array.from(attributeMap.values());
}

/**
 * 🟣 C) Baja conversión (esqueleto)
 * Para esto necesitás VISTAS (Google Analytics, Matomo, etc.)
 * Esto NO sale solo de Presta.
 */
export function getLowConversionProducts({
  salesData,
  viewsByProduct,
  minViews = 100,
}) {
  // salesData: array de { product_id, total_qty, total_revenue }
  // viewsByProduct: { product_id: views }
  const result = [];

  for (const item of salesData) {
    const views = viewsByProduct[item.product_id] || 0;
    if (views < minViews) continue;

    const conversion = item.total_qty / views; // básico

    result.push({
      ...item,
      views,
      conversion,
    });
  }

  // Ordenamos de MENOR a MAYOR conversión → los peores primero
  result.sort((a, b) => a.conversion - b.conversion);

  return result;
}
