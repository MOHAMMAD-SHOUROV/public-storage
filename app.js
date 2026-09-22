```javascript
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
const visibility = document.getElementById("visibility");

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
    result = await client.auth.signUp({
      email: e,
      password: p
    });

    if (!result.error) {
      authMsg.textContent =
        "Registration হয়েছে। Email confirmation চালু থাকলে email verify করুন।";
    }
  } else {
    result = await client.auth.signInWithPassword({
      email: e,
      password: p
    });
  }

  if (result.error) {
    authMsg.textContent = result.error.message;
  }
};

document.getElementById("logoutBtn").onclick = async () => {
  await client.auth.signOut();
};

document.getElementById("refreshBtn").onclick = loadFiles;
document.getElementById("uploadBtn").onclick = uploadFiles;


async function uploadFiles() {
  uploadMsg.textContent = "";

  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) {
    uploadMsg.textContent = "আগে Login করুন।";
    return;
  }

  const files = [...fileInput.files];

  const folder =
    folderInput.value
      .trim()
      .replace(/[^\w\u0980-\u09FF -]/g, "_") || "My Files";

  if (!files.length) {
    uploadMsg.textContent = "আগে photo/video select করুন।";
    return;
  }

  const type = visibility.value;

  const bucket = type === "public"
    ? "public-media"
    : "media";

  let uploaded = 0;

  for (const file of files) {
    const safeName = file.name.replace(
      /[^\w.\-\u0980-\u09FF]/g,
      "_"
    );

    const path =
      `${user.id}/${folder}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}-${safeName}`;

    const { error } = await client.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
        contentType: file.type || undefined
      });

    if (error) {
      uploadMsg.textContent = error.message;
      return;
    }

    uploaded++;
  }

  uploadMsg.textContent =
    `${uploaded}টি ${type === "public" ? "Public" : "Private"} file upload হয়েছে।`;

  fileInput.value = "";

  await loadFiles();
}


async function loadFiles() {
  fileList.innerHTML = "Loading...";

  const {
    data: { user }
  } = await client.auth.getUser();

  if (!user) return;

  fileList.innerHTML = "";

  await loadBucketFiles("media", "Private", user);
  await loadBucketFiles("public-media", "Public", user);
}


async function loadBucketFiles(bucket, type, user) {
  const title = document.createElement("h3");
  title.textContent =
    type === "Private"
      ? "🔒 Private Files"
      : "🌐 Public Files";

  fileList.appendChild(title);

  const { data, error } = await client.storage
    .from(bucket)
    .list(user.id, {
      limit: 100,
      sortBy: {
        column: "name",
        order: "desc"
      }
    });

  if (error) {
    const p = document.createElement("p");
    p.textContent = error.message;
    fileList.appendChild(p);
    return;
  }

  if (!data || data.length === 0) {
    const p = document.createElement("p");
    p.textContent = "No files yet.";
    fileList.appendChild(p);
    return;
  }

  for (const item of data) {
    if (!item.id) {
      const folderName = item.name;

      const { data: children } = await client.storage
        .from(bucket)
        .list(`${user.id}/${folderName}`, {
          limit: 100,
          sortBy: {
            column: "name",
            order: "desc"
          }
        });

      renderChildren(
        bucket,
        type,
        folderName,
        children || [],
        user.id
      );
    }
  }
}


async function renderChildren(
  bucket,
  type,
  folderName,
  children,
  userId
) {
  for (const item of children) {
    if (!item.id) continue;

    const fullPath =
      `${userId}/${folderName}/${item.name}`;

    let openUrl = "";

    if (bucket === "public-media") {
      const { data } = client.storage
        .from(bucket)
        .getPublicUrl(fullPath);

      openUrl = data?.publicUrl || "";
    } else {
      const { data } = await client.storage
        .from(bucket)
        .createSignedUrl(fullPath, 3600);

      openUrl = data?.signedUrl || "";
    }

    const row = document.createElement("div");
    row.className = "file";

    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.name)}</strong>
        <div class="small">
          ${type === "Private" ? "🔒" : "🌐"}
          ${escapeHtml(folderName)}
        </div>
      </div>

      <div>
        ${
          openUrl
            ? `<a href="${escapeAttr(openUrl)}" target="_blank">Open</a>`
            : ""
        }

        <button>Delete</button>
      </div>
    `;

    row.querySelector("button").onclick = async () => {
      if (!confirm("এই file delete করবেন?")) return;

      const { error } = await client.storage
        .from(bucket)
        .remove([fullPath]);

      if (error) {
        alert(error.message);
      } else {
        loadFiles();
      }
    };

    fileList.appendChild(row);
  }
}


function escapeHtml(s) {
  return String(s).replace(
    /[&<>"']/g,
    c => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[c])
  );
}

function escapeAttr(s) {
  return escapeHtml(s);
}


client.auth.onAuthStateChange((_event, session) => {
  if (session?.user) {
    authCard.classList.add("hidden");
    appCard.classList.remove("hidden");

    userEmail.textContent =
      session.user.email || "";

    loadFiles();
  } else {
    authCard.classList.remove("hidden");
    appCard.classList.add("hidden");
  }
});


(async () => {
  const {
    data: { session }
  } = await client.auth.getSession();

  if (session) {
    authCard.classList.add("hidden");
    appCard.classList.remove("hidden");

    userEmail.textContent =
      session.user.email || "";

    loadFiles();
  }
})();
```
