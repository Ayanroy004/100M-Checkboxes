const socket = io();

socket.on("noCheckbox", (data) => {
  alert(data.message);
});
const clearData = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  socket.emit("clear");
  const connectBtn = document.querySelector("#connect");
  const inputName = document.querySelector("#name");
  inputName.disabled = false;
  connectBtn.disabled = false;
  inputName.value = "";

  stateUpdate();
};
async function handelDisconnect() {
  const token = localStorage.getItem("token");
  const user = localStorage.getItem("user");
  if (!token || !user) {
    await alert("Please connect first");

    return;
  }
  socket.emit("userDisconnect");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  const connectBtn = document.querySelector("#connect");
  const inputName = document.querySelector("#name");
  inputName.disabled = false;
  connectBtn.disabled = false;
  inputName.value = "";
  document.querySelector(".show-userName").innerText = "";
  document.querySelector(".discon").style = "display:none";
}

socket.on("userDisconnected", (data) => {
  stateUpdate();
});
function handelSubmitUserName() {
  const getUserValue = document.querySelector("#name");
  const showUserName = document.querySelector(".show-userName");
  if (getUserValue.value !== "") {
    const connectBtn = document.querySelector("#connect");
    connectBtn.disabled = true;

    const inputName = document.querySelector("#name");
    inputName.disabled = true;

    socket.emit("userConnected", getUserValue.value);
    getUserValue.value = "";
  }
}
function renderCheckbox(cachedParseData) {
  const checkboxesContainer = document.getElementById("checkboxes");
  checkboxesContainer.innerHTML = "";
  cachedParseData.forEach((item, index) => {
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = item;

    checkbox.id = `checkbox-${index}`;

    checkboxesContainer.appendChild(checkbox);
  });
}

async function stateUpdate() {
  const token = localStorage.getItem("token");
  if (token) {
    document.querySelector(".discon").style = "display:block";
    const existUser = await fetch("/check-user", {
      headers: {
        Authorization: token.trim(),
        "Content-Type": "application/json",
      },
    });

    const userData = await existUser.json();
    const connectBtn = document.querySelector("#connect");
    const inputName = document.querySelector("#name");
    inputName.value = userData.user;
    inputName.disabled = true;
    connectBtn.disabled = true;
  } else {
    document.querySelector(".discon").style = "display:none";
  }
  const checkBoxes = await fetch("/state", {
    headers: {
      "Content-Type": "application/json",
    },
  });

  const jsonData = await checkBoxes.json();
  const { cachedParseData, totalTic } = jsonData;
  document.querySelector("#total-checked").innerText = totalTic || 0;
  if (cachedParseData) {
    renderCheckbox(cachedParseData);
  } else {
    renderCheckbox(jsonData);
  }
}

socket.on("saveUser", (some) => {
  const { name, jwt } = some;
  localStorage.setItem("token", jwt);
  localStorage.setItem("user", name);
});

socket.on("userDisconnectedDone", (data) => {
  const checkbox = document.getElementById(`checkbox-${data.index}`);
  checkbox.checked = false;
  document.querySelector("#total-checked").innerText = data.count || 0;
});

socket.on("userConnectedDone", (data) => {
  const checkbox = document.getElementById(`checkbox-${data.index}`);
  if (data.flag === 1) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    const connectBtn = document.querySelector("#connect");
    const inputName = document.querySelector("#name");
    inputName.disabled = false;
    connectBtn.disabled = false;
    inputName.value = "";
    renderCheckbox(data.checkbox);
    document.querySelector(".discon").style = "display:none";
  } else {
    checkbox.checked = true;
    const userName = localStorage.getItem("user");
    document.querySelector("#name").value = userName;
  }
  document.querySelector("#total-checked").innerText = data.count || 0;
  const token = localStorage.getItem("token");
  if (token) {
    document.querySelector(".discon").style = "display:block";
  }
});

stateUpdate();
