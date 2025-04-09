const productGrid = document.getElementById("product-grid");
const cartPanel = document.getElementById("cart-panel");
const cartItemsEl = document.getElementById("cart-items");
const cartCount = document.getElementById("cart-count");
const cartTotal = document.getElementById("cart-total");
const emptyMsg = document.getElementById("empty-msg");
const thankYouMsg = document.getElementById("thank-you-msg");
const checkoutForm = document.getElementById("checkout-form");
const nameInput = document.getElementById("checkout-name");
const addressInput = document.getElementById("checkout-address");
const emailInput = document.getElementById("checkout-email");
const phoneInput = document.getElementById("checkout-phone");
const orderSummary = document.getElementById("order-summary");
const toggleCart = document.getElementById("toggle-cart");
const menuToggle = document.getElementById("menu-toggle");
const navMenu = document.getElementById("nav-menu");
const closeBtn = document.getElementById("closeBtn");

let products = [];
let rawCart = JSON.parse(localStorage.getItem("cart")) || [];
let cart = Array.isArray(rawCart)
  ? rawCart.map((item) => {
      // Om item har både product och quantity, låt det vara
      if (item.product && item.quantity) return item;
      // Annars konvertera gammal struktur till ny
      return { product: item, quantity: 1 };
    })
  : [];

menuToggle.addEventListener("click", () => navMenu.classList.toggle("active"));
toggleCart.addEventListener("click", (e) => {
  e.preventDefault();
  cartPanel.classList.toggle("active");
});

async function fetchProducts() {
  try {
    const res = await fetch("https://dummyjson.com/products?limit=30");
    const data = await res.json();
    products = data.products;
    renderProducts();
    generateCategoryFilters();
  } catch (err) {
    productGrid.innerHTML = "<p>Fel vid hämtning av produkter.</p>";
    console.error(err);
  }
}

function generateCategoryFilters() {
  const categories = [...new Set(products.map((p) => p.category))];
  const filterContainer = document.querySelector(".filter");
  categories.forEach((cat) => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" name="kategori" value="${cat}" /> ${cat}`;
    filterContainer.appendChild(label);
  });

  document.querySelectorAll('input[name="kategori"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      const selected = [...document.querySelectorAll('input[name="kategori"]:checked')].map(
        (cb) => cb.value
      );
      renderProducts(selected);
    });
  });
}

function renderProducts(filter = []) {
  productGrid.innerHTML = "";
  const filtered = filter.length ? products.filter((p) => filter.includes(p.category)) : products;

  filtered.forEach((prod) => {
    const div = document.createElement("div");
    div.className = "product-card";
    div.innerHTML = `
  <img src="${prod.thumbnail}" alt="${prod.title}" />
  <h2>${prod.title}</h2>
  <p>${prod.category}</p>
  <div class="product-bottom">
    <span class="price">${prod.price.toFixed(2)} kr</span>
    <button onclick="addToCart(${prod.id})">Köp nu</button>
  </div>
`;

    productGrid.appendChild(div);
  });
}

function addToCart(productId) {
  const product = products.find((p) => p.id === productId);
  const existing = cart.find((item) => item.product.id === productId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ product, quantity: 1 });
  }

  saveCart();
  updateCart();
}

function removeFromCart(index) {
  if (cart[index].quantity > 1) {
    cart[index].quantity -= 1;
  } else {
    cart.splice(index, 1);
  }

  saveCart();
  updateCart();
}

function updateCart() {
  cartItemsEl.innerHTML = "";
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  cartCount.textContent = totalItems;
  emptyMsg.style.display = cart.length === 0 ? "block" : "none";

  let total = 0;

  cart.forEach((item, index) => {
    total += item.product.price * item.quantity;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <p>${item.product.title} - ${item.product.price} kr - ${item.quantity}st</p>
      <div class="cart-buttons">
        <button onclick="decreaseQuantity(${index})">-</button>
        <button onclick="increaseQuantity(${index})">+</button>
        <button onclick="removeProductCompletely(${index})" class="remove-btn">Ta bort helt</button>
      </div>
    `;
    cartItemsEl.appendChild(div);
  });

  cartTotal.textContent = `Totalt: ${total.toFixed(2)} kr`;
  thankYouMsg.style.display = "none";
}

function changeQuantity(index, change) {
  cart[index].quantity += change;

  if (cart[index].quantity <= 0) {
    cart.splice(index, 1); // Ta bort produkten helt om antalet blir 0
  }

  saveCart();
  updateCart();
}

function clearCart() {
  cart = [];
  saveCart();
  updateCart();
  orderSummary.innerHTML = "";
  checkoutForm.style.display = "none";
}

function checkout() {
  if (cart.length === 0) {
    alert("Varukorgen är tom!");
    return;
  }

  let summaryHTML = `
    <h4>Orderöversikt</h4>
    <table class="summary-table">
      <thead>
        <tr>
          <th>Produkt</th>
          <th>Pris</th>
          <th>Antal</th>
          <th>Subtotal</th>
        </tr>
      </thead>
      <tbody>
  `;

  let total = 0;
  cart.forEach((item) => {
    const subtotal = item.product.price * item.quantity;
    total += subtotal;
    summaryHTML += `
      <tr>
        <td>${item.product.title}</td>
        <td>${item.product.price.toFixed(2)} kr</td>
        <td>${item.quantity}</td>
        <td>${subtotal.toFixed(2)} kr</td>
      </tr>
    `;
  });

  summaryHTML += `
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3"><strong>Totalt</strong></td>
          <td><strong>${total.toFixed(2)} kr</strong></td>
        </tr>
      </tfoot>
    </table>
  `;

  orderSummary.innerHTML = summaryHTML;
  checkoutForm.style.display = "block";
  thankYouMsg.style.display = "none";
}

function submitOrder() {
  const name = nameInput.value.trim();
  const email = emailInput.value.trim();
  const phone = phoneInput.value.trim();
  const street = document.getElementById("checkout-street").value.trim();
  const zipcode = document.getElementById("checkout-zipcode").value.trim();
  const city = document.getElementById("checkout-city").value.trim();
  const errorContainer = document.getElementById("form-errors");

  let errors = [];

  // Namn
  if (name.length < 2 || name.length > 50) {
    errors.push("Namn måste vara mellan 2 och 50 tecken.");
  }

  // E-post
  if (!email.includes("@") || email.length > 50) {
    errors.push("Ange en giltig e-postadress (max 50 tecken).");
  }

  // Telefon
  const phoneRegex = /^[0-9()\-\s]+$/;
  if (!phoneRegex.test(phone) || phone.length > 50) {
    errors.push(
      "Ange ett giltigt telefonnummer (siffror, parenteser och bindestreck tillåtna, max 50 tecken)."
    );
  }

  // Gatuadress
  if (street.length < 2 || street.length > 50) {
    errors.push("Gatuadressen måste vara mellan 2 och 50 tecken.");
  }

  // Postnummer
  const zipRegex = /^\d{5}$/;
  if (!zipRegex.test(zipcode)) {
    errors.push("Postnummer måste vara exakt 5 siffror.");
  }

  // Ort
  if (city.length < 2 || city.length > 50) {
    errors.push("Ort måste vara mellan 2 och 50 tecken.");
  }

  if (errors.length > 0) {
    errorContainer.innerHTML = errors.map((err) => `<p>${err}</p>`).join("");
    return;
  } else {
    errorContainer.innerHTML = "";
  }

  // Rensa varukorg
  clearCart();

  // Visa tackmeddelande
  thankYouMsg.textContent = `Tack för din beställning, ${name}! Vi skickar en bekräftelse till ${email}.`;
  thankYouMsg.style.display = "block";
  checkoutForm.style.display = "none";

  // Töm alla fält
  nameInput.value = "";
  addressInput.value = "";
  emailInput.value = "";
  phoneInput.value = "";
  document.getElementById("checkout-street").value = "";
  document.getElementById("checkout-zipcode").value = "";
  document.getElementById("checkout-city").value = "";
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

document.getElementById("closeBtn").addEventListener("click", () => {
  document.getElementById("cart-panel").classList.remove("active");
});

function decreaseQuantity(index) {
  if (cart[index].quantity > 1) {
    cart[index].quantity -= 1;
  } else {
    cart.splice(index, 1);
  }
  saveCart();
  updateCart();
}

function increaseQuantity(index) {
  cart[index].quantity += 1;
  saveCart();
  updateCart();
}

function removeProductCompletely(index) {
  cart.splice(index, 1);
  saveCart();
  updateCart();
}

// Init
fetchProducts();
updateCart();
