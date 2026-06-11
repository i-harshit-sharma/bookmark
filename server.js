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

// Database Schema (Updated with completed status indicator)
const bookmarkSchema = new mongoose.Schema({
  url: { type: String, required: true },
  tags: [{ type: String, trim: true }],
  deleted: { type: Boolean, default: false },
  completed: { type: Boolean, default: false }, // Tasks are incomplete by default
  createdAt: { type: Date, default: Date.now },
});
const Bookmark = mongoose.model("Bookmark", bookmarkSchema);

// Helper function to render a single bookmark row
function renderBookmarkItem(b) {
  const tagsHTML = b.tags && b.tags.length > 0
    ? `<div class="tags-list">${b.tags.map(tag => `<span class="tag-badge">#${tag}</span>`).join("")}</div>`
    : "";

  // Render a checkmark button if incomplete, otherwise show nothing there
  const completeActionHTML = !b.completed 
    ? `
      <form action="/complete/${b._id}" method="POST" style="margin: 0;">
        <button type="submit" class="action-btn complete-btn" title="Mark as Completed">✅</button>
      </form>
    `
    : "";

  return `
    <li class="${b.completed ? 'status-completed' : ''}">
      <div class="bookmark-content">
        <a href="${b.url}" target="_blank" rel="noopener noreferrer" class="bookmark-url">${b.url}</a>
        ${tagsHTML}
      </div>
      <div class="bookmark-actions">
        <span class="date">${new Date(b.createdAt).toLocaleDateString()}</span>
        ${completeActionHTML}
        <form action="/delete/${b._id}" method="POST" style="margin: 0;" onsubmit="return confirmDelete(this)">
          <input type="hidden" name="deletePassword" class="password-submit-field">
          <button type="submit" class="action-btn delete-btn" title="Delete">🗑️</button>
        </form>
      </div>
    </li>
  `;
}

// Main Route: Displays forms and segmented lists
app.get("/", async (req, res) => {
  try {
    // Fetch all active records
    const bookmarks = await Bookmark.find({ deleted: { $ne: true } }).sort({ createdAt: -1 });

    // Separate active records into incomplete and completed arrays
    const incompleteTasks = bookmarks.filter(b => !b.completed);
    const completedTasks = bookmarks.filter(b => b.completed);

    const incompleteHTML = incompleteTasks.length > 0 
      ? incompleteTasks.map(renderBookmarkItem).join("")
      : '<li style="justify-content: center; color: #888;">No pending tasks!</li>';

    const completedHTML = completedTasks.length > 0
      ? completedTasks.map(renderBookmarkItem).join("")
      : '<li style="justify-content: center; color: #888;">No completed tasks yet.</li>';

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
          h2 { font-size: 18px; color: #4a5568; margin-top: 30px; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px;}
          
          form.add-form { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
          .form-group { display: flex; flex-direction: column; gap: 6px; }
          .form-group label { font-size: 13px; font-weight: 600; color: #555; }
          input[type="url"], input[type="text"] { padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 15px; background-color: #fafafa; }
          input:focus { outline: none; border-color: #007bff; background-color: #fff; }
          
          form.add-form button { padding: 12px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; font-weight: bold; margin-top: 5px; transition: background 0.2s; }
          form.add-form button:hover { background-color: #0056b3; }
          
          ul { list-style: none; padding: 0; margin: 0; }
          li { background: white; padding: 16px; margin-bottom: 12px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); display: flex; justify-content: space-between; align-items: center; gap: 20px; transition: all 0.2s; }
          
          /* Visual cue for completed entries */
          li.status-completed { background: #fafafa; opacity: 0.7; }
          li.status-completed .bookmark-url { color: #718096; text-decoration: line-through; font-weight: normal; }
          li.status-completed .tag-badge { background-color: #edf2f7; color: #4a5568; }

          .bookmark-content { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 0; }
          .bookmark-url { color: #007bff; text-decoration: none; word-break: break-all; font-weight: 500; font-size: 16px; }
          .bookmark-url:hover { text-decoration: underline; }
          
          .tags-list { display: flex; flex-wrap: wrap; gap: 6px; }
          .tag-badge { background-color: #eaf2ff; color: #0056b3; padding: 3px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
          
          .bookmark-actions { display: flex; align-items: center; gap: 12px; }
          .date { font-size: 12px; color: #888; white-space: nowrap; }
          
          .action-btn { background: none; border: none; cursor: pointer; font-size: 16px; padding: 6px; border-radius: 4px; transition: background 0.2s; }
          .complete-btn:hover { background-color: #e6fffa; }
          .delete-btn:hover { background-color: #ffeef0; }
        </style>
        
        <script>
          function confirmDelete(formElement) {
            const pwd = prompt("🔒 Enter the admin password to delete this bookmark:");
            if (pwd === null || pwd.trim() === "") {
              return false; 
            }
            formElement.querySelector('.password-submit-field').value = pwd;
            return true;
          }
        </script>
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
            <input type="text" id="tags" name="tags" placeholder="e.g. tech, video, recipe (comma separated)">
          </div>
          <button type="submit">Save Bookmark</button>
        </form>

        <h2>⏳ Incomplete Tasks</h2>
        <ul>${incompleteHTML}</ul>

        <h2>✅ Completed Tasks</h2>
        <ul>${completedHTML}</ul>
      </body>
      </html>
    `;
    res.send(html);
  } catch (err) {
    res.status(500).send("Error loading bookmarks.");
  }
});

// Post Route: Handles saving new URLs (Incomplete by default)
app.post("/add", async (req, res) => {
  let { url, tags } = req.body;

  if (!/^https?:\/\//i.test(url)) {
    url = "https://" + url;
  }

  const processedTags = tags
    ? tags.split(",").map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0)
    : [];

  try {
    // Explicitly declaring completed: false is optional due to schema defaults, but clarifies intent
    const newBookmark = new Bookmark({ url, tags: processedTags, completed: false });
    await newBookmark.save();
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error saving your bookmark.");
  }
});

// Post Route: Handles marking an item as complete
app.post("/complete/:id", async (req, res) => {
  try {
    await Bookmark.findByIdAndUpdate(req.params.id, { completed: true });
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error marking task as complete.");
  }
});

// Post Route: Handles soft deletion (Requires password validation)
app.post("/delete/:id", async (req, res) => {
  const { deletePassword } = req.body;
  const masterPassword = process.env.DELETE_PASSWORD || "admin123";

  if (deletePassword !== masterPassword) {
    return res.status(403).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h2>❌ Access Denied</h2>
        <p>Incorrect deletion password.</p>
        <a href="/" style="color: #007bff; text-decoration: none; font-weight: bold;">Go Back</a>
      </div>
    `);
  }

  try {
    await Bookmark.findByIdAndUpdate(req.params.id, { deleted: true });
    res.redirect("/");
  } catch (err) {
    res.status(500).send("Error dropping bookmark entry.");
  }
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 App running! Access it locally at http://localhost:${PORT}`);
});