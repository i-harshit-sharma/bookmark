const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv")

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
// (If using MongoDB Atlas for cloud access, replace this string with your Atlas connection URI)
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  throw new Error("MongoDB URI undefined");
}
mongoose
  .connect(mongoURI)
  .then(() => console.log("📦 Connected to MongoDB..."))
  .catch((err) => console.error("❌ Could not connect to MongoDB:", err));

// Database Schema
const bookmarkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});
const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

// Main Route: Displays the form and all saved bookmarks
app.get("/", async (req, res) => {
  try {
    const bookmarks = await Bookmark.find().sort({ createdAt: -1 });

    // Generate dynamic HTML list items
    let listItems = bookmarks
      .map(
        (b) => `
      <li>
        <a href="${b.url}" target="_blank" rel="noopener noreferrer">${b.url}</a>
        <span class="date">${new Date(b.createdAt).toLocaleDateString()}</span>
      </li>
    `,
      )
      .join("");

    if (bookmarks.length === 0) {
      listItems =
        '<li style="justify-content: center; color: #888;">No bookmarks saved yet!</li>';
    }

    // Inline HTML/CSS UI
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SyncBookmarks</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 600px; margin: 40px auto; padding: 0 20px; background-color: #f4f6f8; color: #333; }
          h1 { color: #2c3e50; text-align: center; font-size: 28px; }
          form { display: flex; gap: 10px; margin-bottom: 30px; }
          input[type="url"] { flex: 1; padding: 12px; border: 1px solid #ccc; border-radius: 6px; font-size: 16px; box-shadow: inset 0 1px 3px rgba(0,0,0,0.05); }
          button { padding: 12px 24px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; }
          button:hover { background-color: #0056b3; }
          ul { list-style: none; padding: 0; }
          li { background: white; padding: 15px; margin-bottom: 12px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); display: flex; justify-content: space-between; align-items: center; gap: 15px; }
          a { color: #007bff; text-decoration: none; word-break: break-all; font-weight: 500; }
          a:hover { text-decoration: underline; }
          .date { font-size: 12px; color: #888; white-space: nowrap; }
        </style>
      </head>
      <body>
        <h1>🔖 SyncBookmarks</h1>
        <form action="/add" method="POST">
          <input type="url" name="url" placeholder="https://example.com" required>
          <button type="submit">Save</button>
        </form>
        <ul>
          ${listItems}
        </ul>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send("Error loading bookmarks.");
  }
});

// Post Route: Handles saving new URLs
app.post("/add", async (req, res) => {
  let { url } = req.body;

  // Ensure url has a protocol format
  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  try {
    const newBookmark = new Bookmark({ url });
    await newBookmark.save();
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error saving your bookmark.");
  }
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 App running! Access it locally at http://localhost:${PORT}`);
});
