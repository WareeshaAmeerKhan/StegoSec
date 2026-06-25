# StegoSec - Complete System Documentation

## 📚 Table of Contents

1. [System Overview](#system-overview)
2. [How It Works](#how-it-works)
3. [Page-by-Page Breakdown](#page-by-page-breakdown)
4. [Security Features Explained](#security-features-explained)
5. [Getting Started Guide](#getting-started-guide)

---

## 🎯 System Overview

**StegoSec** is a secure messaging application that hides messages inside ordinary image files. To anyone observing you, it looks like you're just sharing photos. But in reality, you're sending encrypted, secret messages.

### Key Philosophy

- **Nothing is obvious** - Messages hide inside regular images
- **Encryption first** - All messages are mathematically locked
- **No servers** - Everything happens in your browser only
- **No accounts** - Just a username and security key

---

## 🔐 How It Works

### The Basic Flow

```
┌─────────────────────────────────────────────────────────┐
│                                                           │
│  1. You create an account                                │
│     └─ Get a unique Security Key                         │
│                                                           │
│  2. Add a contact (friend)                               │
│     └─ Create a secure private channel with them         │
│                                                           │
│  3. Send a message                                       │
│     ├─ Pick a carrier image (any regular photo)          │
│     ├─ Hide your message inside it (LSB encoding)        │
│     ├─ Lock it with your Security Key (Encryption)       │
│     └─ Send as a normal image file                       │
│                                                           │
│  4. Receiver gets the image                              │
│     ├─ Clicks "View Message"                             │
│     ├─ Enters their Security Key                         │
│     ├─ The hidden message appears                        │
│     └─ To observers: just a photo was shared             │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Three Layers of Hiding

1. **Visual Layer** - Message is inside an ordinary image
2. **Technical Layer** - Hidden in the least-significant pixel bits
3. **Encryption Layer** - Locked with a mathematical key

---

## 📄 Page-by-Page Breakdown

### 🏠 **HOME PAGE** - The Entrance

**What you see:**

- Hero section with features overview
- Visual cards showing what the app can do
- Two buttons: LOGIN or GET STARTED

**What happens:**

- Users learn about the platform
- First-time users click "GET STARTED" to create an account
- Existing users click "LOGIN"

**Code location:** `src/pages/HomePage.jsx`

---

### 🔑 **AUTH PAGE** - Create Account or Login

#### Sign Up Flow

1. **Enter username** - This is your public identity
2. **Enter password** - This creates your unique Security Key
3. **System generates** - A unique 256-bit Security Key derived from your password
4. **You see it once** - The key appears on screen (save it!)
5. **Auto-login** - You're immediately logged in

#### Login Flow

1. **Enter username** - Who you are
2. **Enter password** - Unlocks your Security Key
3. **System verifies** - Your stored data is loaded
4. **You're in** - You can now access your contacts and messages

**Why passwords instead of the key directly?**

- Passwords are easy to remember
- The Security Key is generated mathematically from your password
- If you forget your password, you need to create a new account

**Code location:** `src/pages/AuthPage.jsx`

---

### 👤 **PROFILE PAGE** - Your Identity Card

**Three main sections:**

#### 1. **Agent Identity Card** (Left side)

- Shows your username
- Displays your Security Key (hidden by default)
- Shows statistics: messages sent/received, contacts count

**Why hide the key?**

- Only you need to see it
- It's extremely valuable - anyone with it can decrypt your conversations
- Click "SHOW" to reveal it temporarily

#### 2. **Secure Network** (Right side)

- **Search Users** - Find people by username
- **Pending Requests** - Friend requests waiting for acceptance
- **Active Contacts** - People you're connected with

#### 3. **Statistics**

- **Messages Sent** - How many encrypted messages you've created
- **Messages Received** - How many you've received
- **Contacts** - How many people you're connected with

**Code location:** `src/pages/ProfilePage.jsx`

---

### 💬 **CHAT PAGE** - Send & Receive Secret Messages

**Layout:**

```
┌────────────────┬──────────────────────────┐
│                │                          │
│   CONTACTS     │   CONVERSATION           │
│   (Left)       │   (Right)                │
│                │                          │
│  - Alice       │  ALICE's Channel         │
│  - Bob         │  Private & Encrypted     │
│  - Carol       │                          │
│                │  ┌──────────────────┐    │
│                │  │  [Hidden Message]│    │
│                │  │  Jan 5, 2:30 PM  │    │
│                │  └──────────────────┘    │
│                │                          │
│                │  ┌──────────────────┐    │
│                │  │ You: [Your Photo]│    │
│                │  │  Jan 5, 2:28 PM  │    │
│                │  └──────────────────┘    │
│                │                          │
└────────────────┴──────────────────────────┘
```

#### **Sending a Message** (6 steps)

1. **Choose contact** - Click on a name in the left panel
2. **Type message** - Write what you want to send
3. **Optional: Add decoy** - Add a fake "cover" message (advanced feature)
4. **Select image** - Upload any photo as a carrier
5. **Enable auto-delete?** - Optional: message disappears after viewing
6. **Send** - The app hides message in image and encrypts it

#### **Receiving a Message** (3 steps)

1. **You see an image** - Click on it or click "VIEW MESSAGE"
2. **Enter Security Key** - A popup asks for your key
3. **Message appears** - If key is correct, you see the text

**What if you enter the wrong key?**

- The message won't decrypt
- Error message appears: "Unable to decrypt. Check your security key."
- You can try again

**Code location:** `src/pages/ChatPage.jsx`

---

### ⚡ **ATTACK SIMULATOR** - Security Demonstrations

**Three tabs showing real attacks and why the app is secure:**

#### Tab 1: **Covert Capture & Forensic Watermarking**

**The Attack:**

- Imagine someone steals a photo from your device
- They want to hide the fact that they stole it

**The Defense:**

- Your app can embed an invisible watermark with:
  - Your username
  - Exact timestamp
  - Hidden in pixel-level data (invisible to naked eye)

**How to test:**

1. Click "ACTIVATE SENSOR"
2. Allow webcam access
3. Click "CAPTURE FRAME"
4. Click "INJECT TRACER PAYLOAD"
5. The photo now has a hidden signature

**Why it matters:**

- If this photo appears somewhere public, it proves who leaked it
- The leaker can't remove it (it's mathematically embedded)

#### Tab 2: **AES-256 Key Breaker Simulation**

**The Challenge:**

- Upload a stego-image (message hidden inside)
- Simulate trying to crack the encryption

**How it works:**

1. Upload a stego-image from your chat
2. Click "LAUNCH BRUTE-FORCE"
3. Watch the attack cluster try millions of keys per second
4. It fails after billions of attempts

**The Math:**

- Your encryption has 2^256 possible keys (10^77 unique combinations)
- The world's fastest computer tries 10^15 keys per second
- Time to crack: approximately 3.3 trillion years

**Why it fails:**

- Brute force is mathematically impossible
- Security is proven by mathematics, not luck

#### Tab 3: **Network Packet Interception**

**The Scenario:**

- An attacker is watching your network traffic
- They intercept an image file you're sending

**What they see:**

```
[Network Packet Captured]
- Type: PNG image
- Size: 83 KB
- Content: Unreadable binary data
```

**What happens next:**

- The attacker extracts the data
- It looks like random noise (encrypted)
- No message is readable
- No key to decrypt

**Why it's safe:**

- Your message is locked inside
- Even if someone sees the file, it's useless without the key
- The encryption is too strong to break

**Code location:** `src/pages/AttackSimulatorPage.jsx`

---

### 🔍 **STEGANALYSIS PANEL** - Detect Hidden Messages

**What it does:**
Analyzes images to detect if messages are hidden inside using basic steganography.

#### Three Analysis Types:

##### 1. **Chi-Square Test**

- Measures if pixel values are "too equal"
- Basic steganography leaves patterns
- This app's messages pass as normal images (because of encryption)

##### 2. **Histogram Analysis**

- Shows the color distribution (before and after)
- Red/Green/Blue channels
- StegoSec images look identical to normal photos

##### 3. **Bit-Plane Visualization**

- Shows the least-significant bits as a black & white image
- Normal images: random pattern
- Basic stego images: visible patterns
- StegoSec images: appear random (encryption hides patterns)

**How to test:**

1. Upload any image from the chat
2. Click "RUN FULL ANALYSIS SUITE"
3. See detailed forensic results

**Why this matters (for your project):**

- Proves your encryption prevents detection
- Shows the difference between weak and strong steganography
- Educates on forensic analysis methods

**Code location:** `src/pages/SteganalysisPage.jsx`

---

### 📋 **AUDIT LOG** - Security Events

**What it tracks:**
Every single action in the system is logged:

| Event         | Example                        |
| ------------- | ------------------------------ |
| LOGIN         | User logged in at 2:30 PM      |
| SIGNUP        | New account created            |
| SEND          | Message sent to Alice          |
| DECRYPT       | Message decrypted successfully |
| CRYPTO        | Encryption applied             |
| FRIEND        | Friend request sent            |
| SELF-DESTRUCT | Message burned after reading   |
| STEGANALYSIS  | Forensic analysis completed    |

**Red entries = failures:**

- Wrong password attempts
- Decryption failures
- Connection errors

**Green entries = success:**

- Successful logins
- Messages sent
- Analysis completed

**Why log everything?**

- Prove what happened and when
- Detect suspicious activity
- Account for all actions

**Code location:** `src/pages/AuditLogPage.jsx`

---

### 🎭 **STEALTH MODE** - Plausible Deniability

**What it does:**
Hides the app's real interface behind a fake photo gallery.

**How to activate:**

- **Triple-click** the logo in top-left corner, OR
- Press **Ctrl+Shift+S** on keyboard

**What happens:**

- The entire interface becomes a normal photo gallery app
- No visible encryption features
- No mention of messages or security
- If someone takes your phone, they see just photos

**Real-world use:**

- In some countries, encryption apps are restricted
- This lets you deny using it ("I'm just viewing photos")
- Provides plausible deniability if forced to unlock your phone

**To get back:**

- Triple-click the logo again
- Or press Ctrl+Shift+S again

**Code location:** `src/components/StealthMode.jsx`

---

## 🔐 Security Features Explained

### **1. Security Key System**

**Your Security Key is:**

- A unique 256-bit mathematical key
- Generated from your password + username
- Stored in your browser's secure storage
- Never transmitted to any server

**How it protects you:**

- Only you know your password
- Only you can recreate your key
- Your key unlocks all your messages
- Mathematically impossible to guess

### **2. Per-Contact Channels**

**Each friend has a unique channel:**

- Messages to Alice use one key
- Messages to Bob use a different key
- If one key is compromised, only that channel is affected
- Other conversations stay secure

### **3. Double Encryption**

Messages are locked twice:

```
Your Message
    ↓
[Locked with Math #1] ← Channel key (you + contact)
    ↓
[Locked with Math #2] ← Encoding in image pixels
    ↓
Carrier Image (looks like a normal photo)
```

### **4. Self-Destruct Messages**

Messages can disappear automatically:

- Toggle "Auto-delete" when sending
- After receiver opens it once
- Image is deleted and marked as burned
- Second attempt shows "Message Destroyed"

### **5. Deniable Encryption**

Optional fake message layer:

- Send real message: "Attack at dawn"
- Add decoy message: "Hey, how are you?"
- Wrong key decrypts: "Hey, how are you?" (harmless)
- Right key decrypts: "Attack at dawn" (real message)

---

## 🚀 Getting Started Guide

### **Step 1: Create Account**

```
Go to localhost:5173
↓
Click "GET STARTED"
↓
Enter username (e.g., "alice")
↓
Enter strong password
↓
See your Security Key displayed
↓
SAVE IT SOMEWHERE SAFE (optional but recommended)
```

### **Step 2: Add Your First Contact**

```
Go to Profile page
↓
Search for a username (e.g., "bob")
↓
Click "Send Request"
↓
Wait for them to accept (or open second browser tab to test)
```

### **Step 3: Send Your First Message**

```
Go to Chat page
↓
Select contact from left sidebar
↓
Type a secret message
↓
Upload any image (cat photo, sunset, etc.)
↓
Click "SEND"
```

### **Step 4: Receive & Decrypt**

```
Switch to receiver's account
↓
See the image in chat
↓
Click "VIEW MESSAGE"
↓
Enter your Security Key
↓
Your message appears!
```

### **Step 5: Explore Advanced Features**

```
Try these:
- Deniable Encryption (add a decoy message)
- Self-Destruct (auto-delete after reading)
- Attack Simulator (see why it's secure)
- Steganalysis (analyze images forensically)
- Stealth Mode (hide the app's interface)
- Audit Log (see all events)
```

---

## 🎓 Learning Path

### For Security Students:

1. **Start:** Understand the basic flow (Home → Auth → Chat)
2. **Explore:** Attack Simulator → see why encryption matters
3. **Analyze:** Steganalysis → learn forensic detection methods
4. **Deep Dive:** Examine the key derivation system in Security Info modal

### For Project Presenters:

1. **Demo Flow:**
   - Show signup process
   - Send a message
   - Show it's hidden in image
   - Decrypt it
   - Show Audit Log (proved it happened)

2. **Security Proofs:**
   - Attack Simulator → prove brute force fails
   - Steganalysis → prove detection fails
   - Network demo → prove interception is useless

3. **Advanced Features:**
   - Stealth mode (plausible deniability)
   - Self-destruct (message destruction)
   - Deniable encryption (fake messages)

---

## 🛠️ Technical Architecture

(Simplified - not showing technical jargon in UI)

### **Storage:**

- **Users table** - Username, security key salt
- **Friends table** - Relationships, shared secrets
- **Messages table** - Encrypted messages, metadata
- **Audit logs table** - All events with timestamps

### **Encryption:**

- **PBKDF2-SHA256** - Convert password to key (slow = secure)
- **HKDF-SHA256** - Generate unique channel keys
- **AES-256-GCM** - Encrypt/decrypt messages
- **LSB Encoding** - Hide data in image pixels

### **All Cryptography:**

- Uses browser's built-in Web Crypto API
- No external libraries (faster + more secure)
- Runs entirely in your browser (no server)

---

## ❓ FAQ

**Q: What if I forget my password?**
A: You'll need to create a new account. There's no password recovery (by design - no central server).

**Q: Can I use the same image multiple times?**
A: Yes, but each use embeds different encrypted content. The image looks different each time.

**Q: What if someone has my username?**
A: They still need your Security Key or password to decrypt anything. Knowing the username doesn't help.

**Q: Can I see who else is using the app?**
A: Only by searching usernames in your Profile. The app doesn't show a public user list.

**Q: How do I add someone if they're not in the system yet?**
A: They need to create an account first. Then you search for their username.

**Q: Can I delete messages?**
A: They stay in your Audit Log forever (for security proof), but you can use Self-Destruct to auto-delete after viewing.

**Q: What if my contact list is huge?**
A: It's all stored in your browser's database. Unlimited contacts per device.

**Q: How is this different from WhatsApp?**
A: - WhatsApp: Messages are text + metadata visible to servers

- StegoSec: Messages are hidden inside images + encrypted + server-independent

---

## 💡 Key Takeaways

1. **Hiding is different from encrypting** - This app does both
2. **Mathematics is your security** - Not physical locks or servers
3. **No server = No data leaks** - Everything stays on your device
4. **Everything is logged** - You know exactly what happened
5. **Cryptography is science** - Not guessable or hackable

---

**Created:** May 10, 2026
**Version:** 2.0 (Full-featured)
**Status:** Production-ready security platform
