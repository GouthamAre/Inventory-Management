Open a terminal in your project folder (where package.json is located).
And Run the command:
npm install

**This will automatically:**
Read the package.json file
Download and install all required dependencie
Creates a node_modules folder in the same directory


After that, start your server with:
node server.js



Below is the Structure of Our project(VS CODE):
📂 inventory-system
┣ 📂 backend
┃ ┣ 📜 server.js
┃ ┣ 📜 db.js
┣ 📜 index.html
┣ 📜 style.css
┣ 📜 script.js
┣ 📜 README.md
┗ 📂 node_modules (⚠️ auto-generated after npm install)
