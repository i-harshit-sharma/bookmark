const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse form data
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  throw new Error("MongoDB URI undefined");
}
mongoose
  .connect(mongoURI)
  .then(() => console.log("📦 Connected to MongoDB..."))
  .catch((err) => console.error("❌ Could not connect to MongoDB:", err));

// Database Schema (Updated with tags array)
const bookmarkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  createdAt: { type: Date, default: Date.now },
});
const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

// Main Route: Displays the form and all saved bookmarks
app.get("/", async (req, res) => {
  try {
    const bookmarks = await Bookmark.find().sort({ createdAt: -1 });

    // Generate dynamic HTML list items
    let listItems = bookmarks
      .map((b) => {
        // Generate tag badges if tags exist
        const tagsHTML = b.tags && b.tags.length > 0
          ? `<div class="tags-list">${b.tags.map(tag => `<span class="tag-badge">#${tag}</span>`).join("")}</div>`
          : "";

        return `
          <li>
            <div class="bookmark-content">
              <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="bookmark-url">${b.url}</a>
              ${tagsHTML}
            </div>
            <div class="bookmark-actions">
              <span class="date">${new Date(b.createdAt).toLocaleDateString()}</span>
              <form action="/delete/${b._id}" method="POST" style="margin: 0;">
                <button type="submit" class="delete-btn" onclick="return confirm('Delete this bookmark?')">🗑️</button>
              </form>
            </div>
          </li>
        `;
      })
      .join("");

    if (bookmarks.length === 0) {
      listItems = '<li style="justify-content: center; color: #888;">No bookmarks saved yet!</li>';
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
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; max-width: 650px; margin: 40px auto; padding: 0 20px; background-color: #f4f6f8; color: #333; }
          h1 { color: #2c3e50; text-align: center; font-size: 28px; margin-bottom: 25px; }
          
          /* Form layout updates for multi-input stability */
          form.add-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 35px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
          .form-group { display: flex; flex-direction: column; gap: 6px; }
          .form-group label { font-size: 13px; font-weight: 600; color: #555; }
          input[type="url"], input[type="text"] { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; background-color: #fafafa; }
          input:focus { outline: none; border-color: #007bff; background-color: #fff; }
          
          form.add-form button { padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin-top: 5px; transition: background 0.2s; }
          form.add-form button:hover { background-color: #0056b3; }
          
          /* Bookmark Row formatting */
          ul { list-style: none; padding: 0; }
          li { background: white; padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; gap: 20px; }
          .bookmark-content { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
          .bookmark-url { color: #007bff; text-decoration: none; word-break: break-all; font-weight: 500; font-size: 16px; }
          .bookmark-url:hover { text-decoration: underline; }
          
          /* Tag pills styling */
          .tags-list { display: flex; flex-wrap: wrap; gap: 6px; }
          .tag-badge { background-color: #eaf2ff; color: #0056b3; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
          
          /* Actions column formatting */
          .bookmark-actions { display: flex; align-items: center; gap: 15px; transform: translateY(-1px); }
          .date { font-size: 12px; color: #888; white-space: nowrap; }
          .delete-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 6px; border-radius: 4px; transition: background 0.2s; }
          .delete-btn:hover { background-color: #ffeef0; }
        </style>
      </head>
      <body>
        <h1>🔖 SyncBookmarks</h1>
        
        <form action="/add" method="POST" class="add-form">
          <div class="form-group">
            <label for="url">URL</label>
            <input type="url" id="url" name="url" placeholder="https://example.com" required>
          </div>
          <div class="form-group">
            <label for="tags">Tags</label>
            <input type="text" id="tags" name="tags" placeholder="e.g. tech, development, reading (comma separated)">
          </div>
          <button type="submit">Save Bookmark</button>
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

// Post Route: Handles saving new URLs and associated tags
app.post("/add", async (req, res) => {
  let { url, tags } = req.body;

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  // Parse comma-separated string tags into an array of strings, trimming whitespace and filtering empties
  const processedTags = tags
    ? tags.split(",")
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0)
    : [];

  try {
    const newBookmark = new Bookmark({ url, tags: processedTags });
    await newBookmark.save();
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error saving your bookmark.");
  }
});

// Post Route: Handles deleting an individual entry
app.post("/delete/:id", async (req, res) => {
  try {
    await Bookmark.findByIdAndDelete(req.params.id);
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error deleting the bookmark.");
  }
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 App running! Access it locally at http://localhost:${PORT}`);
});