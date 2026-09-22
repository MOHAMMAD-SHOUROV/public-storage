// 1) Replace these two values with your Supabase project values.
// Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = "https://huxzyyuglgiqbnliykbn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_SHKodBygTwiMF7GY0bLvYQ_yDwsOiC2";

const client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const authCard = document.getElementById("authCard");
const appCard = document.getElementById("appCard");
const email = document.getElementById("email");
const password = document.getElementById("password");
const authBtn = document.getElementById("authBtn");
const authMsg = document.getElementById("authMsg");
const uploadMsg = document.getElementById("uploadMsg");
const fileInput = document.getElementById("fileInput");
const folderInput = document.getElementById("folder");
const fileList = document.getElementById("fileList");
const userEmail = document.getElementById("userEmail");

let mode = "login";

document.getElementById("loginTab").onclick = () => {
  mode = "login";
  document.getElementById("loginTab").classList.add("active");
  document.getElementById("registerTab").classList.remove("active");
  authBtn.textContent = "Login";
  authMsg.textContent = "";
};

document.getElementById("registerTab").onclick = () => {
  mode = "register";
  document.getElementById("registerTab").classList.add("active");
  document.getElementById("loginTab").classList.remove("active");
  authBtn.textContent = "Register";
  authMsg.textContent = "";
};

authBtn.onclick = async () => {
  authMsg.textContent = "Please wait...";
  const e = email.value.trim();
  const p = password.value;

  if (!e || !p) {
    authMsg.textContent = "Email and password দিন।";
    return;
  }

  let result;
  if (mode === "register") {
    result = await client.auth.signUp({ email: e, password: p });
    if (!result.error) {
      authMsg.textContent = "Registration হয়েছে। Email confirmation চালু থাকলে email verify করুন।";
    }
  } else {
    result = await client.auth.signInWithPassword({ email: e, password: p });
  }

  if (result.error) authMsg.textContent = result.error.message;
};

document.getElementById("logoutBtn").onclick = async () => {
  await client.auth.signOut();
};

document.getElementById("refreshBtn").onclick = loadFiles;
document.getElementById("uploadBtn").onclick = uploadFiles;

async function uploadFiles() {
  uploadMsg.textContent = "";
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const files = [...fileInput.files];
  const folder = folderInput.value.trim().replace(/[^\w\u0980-\u09FF -]/g, "_") || "My Files";

  if (!files.length) {
    uploadMsg.textContent = "আগে photo/video select করুন।";
    return;
  }

  for (const file of files) {
    // Safe per-user path: user-id/folder/random-name
    const safeName = file.name.replace(/[^\w.\-\u0980-\u09FF]/g, "_");
    const path = `${user.id}/${folder}/${Date.now()}-${safeName}`;

    const { error } = await client.storage.from("media").upload(path, file, {
      upsert: false,
      contentType: file.type || undefined
    });

    if (error) {
      uploadMsg.textContent = error.message;
      return;
    }
  }

  uploadMsg.textContent = `${files.length}টি file upload হয়েছে।`;
  fileInput.value = "";
  await loadFiles();
}

async function loadFiles() {
  fileList.innerHTML = "Loading...";
  const { data: { user } } = await client.auth.getUser();
  if (!user) return;

  const { data, error } = await client.storage.from("media").list(user.id, {
    limit: 100,
    sortBy: { column: "name", order: "desc" }
  });

  if (error) {
    fileList.innerHTML = `<p>${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data || data.length === 0) {
    fileList.innerHTML = "<p>No files yet.</p>";
    return;
  }

  fileList.innerHTML = "";
  for (const item of data) {
    // The first level can contain folders, so list recursively one folder at a time.
    if (!item.id) {
      const folderName = item.name;
      const { data: children } = await client.storage.from("media").list(`${user.id}/${folderName}`, {
        limit: 100,
        sortBy: { column: "name", order: "desc" }
      });
      renderChildren(folderName, children || []);
    }
  }
}

async function renderChildren(folderName, children) {
  for (const item of children) {
    if (!item.id) continue;
    const path = `${folderName}/${item.name}`;
    const fullPath = (await client.auth.getUser()).data.user.id + "/" + path;

    const { data: signed, error } = await client.storage.from("media").createSignedUrl(fullPath, 3600);
    const row = document.createElement("div");
    row.className = "file";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="small">📁 ${escapeHtml(folderName)}</div>
      </div>
      <div>
        ${signed && !error ? `<a href="${signed.signedUrl}" target="_blank">Open</a>` : ""}
        <button data-path="${escapeAttr(fullPath)}">Delete</button>
      </div>
    `;
    row.querySelector("button").onclick = async () => {
      if (!confirm("এই file delete করবেন?")) return;
      const { error } = await client.storage.from("media").remove([fullPath]);
      if (error) alert(error.message);
      else loadFiles();
    };
    fileList.appendChild(row);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[c]));
}
function escapeAttr(s) { return escapeHtml(s); }

client.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    authCard.classList.add("hidden");
    appCard.classList.remove("hidden");
    userEmail.textContent = session.user.email || "";
    loadFiles();
  } else {
    authCard.classList.remove("hidden");
    appCard.classList.add("hidden");
  }
});

(async () => {
  const { data } = await client.auth.getSession();
  if (data.session) {
    authCard.classList.add("hidden");
    appCard.classList.remove("hidden");
    userEmail.textContent = data.session.user.email || "";
    loadFiles();
  }
})();
