![Banner](https://www.upload.ee/image/17719902/k9crypt-cli.png)

<div align="center">

# K9Crypt CLI

🔐 **Secure. Private. Real-time.**

[![npm version](https://img.shields.io/npm/v/k9crypt-cli.svg?style=flat-square)](https://www.npmjs.org/package/k9crypt-cli)
[![npm downloads](https://img.shields.io/npm/dm/k9crypt-cli.svg?style=flat-square)](https://npm-stat.com/charts.html?package=k9crypt-cli)
[![GitHub license](https://img.shields.io/github/license/k9crypt/k9crypt-cli?style=flat-square)](https://github.com/k9crypt/k9crypt-cli/blob/main/LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://github.com/k9crypt/k9crypt-cli/pulls)

Transform your terminal into a fortress of secure communication.
End-to-end encrypted chat rooms at your fingertips.

[Installation](#installation) • [Features](#features) • [Quick Start](#quick-start) • [Documentation](#documentation)

</div>

## ✨ Features

- **🛡️ End-to-End Encryption** - Military-grade security for your conversations
- **🚀 Real-time Chat** - Lightning-fast message delivery
- **⏱️ Flexible Room Lifetimes** - From ephemeral to permanent
- **🔒 Private Rooms** - Password-protected spaces for confidential discussions
- **🎯 Simple Interface** - Powerful functionality with minimal complexity
- **📱 Cross-Platform** - Works seamlessly on macOS, Linux, and Windows

## 🚀 Quick Start

### Installation
```bash
npm install -g k9crypt-cli
```

### Create Your First Room
```bash
k9crypt create secret-room private mypassword -l day
```

### Join and Start Chatting

```bash
k9crypt join 550e8400-e29b-41d4-a716-446655440000 # room id
k9crypt chat 550e8400-e29b-41d4-a716-446655440000 # room id
```


## 📖 Documentation

### Room Management

Create a new room with various options:
```bash
k9crypt create <room-name> <type> [password] [-l|--lifetime <duration>]
```

Join an existing room:
```bash
k9crypt join <room-name> [password] # if private room, provide password
```

Leave a room:
```bash
k9crypt leave <room-name>
```

View available rooms:
```bash
k9crypt list
```

### Messaging

Send a message to a room:
```bash
k9crypt send <room-name> <message>
```

Start interactive chat:
```bash
k9crypt chat <room-id>
```

## 🏗️ Room Configuration

### Types
- `public` - Open rooms for community discussions
- `private` - Password-protected rooms for confidential communication

### Lifetime Options
| Option | Duration | Use Case |
|--------|----------|----------|
| `day` | 24 hours | Quick discussions |
| `month` | 30 days | Project coordination |
| `year` | 365 days | Long-term collaboration |
| `permanent` | Forever | Persistent channels |

## 🔒 Security

K9Crypt employs state-of-the-art encryption protocols to ensure:
- End-to-end encryption for all messages
- Zero-knowledge architecture
- No message persistence outside specified lifetime
- Secure key exchange protocols

## 🛠️ Development

Get started with development in three simple steps:

```bash
# Clone the repository
git clone https://github.com/k9crypt/k9crypt-cli.git

# Install dependencies
cd k9crypt-cli && npm install

# Link for development
npm link
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

K9Crypt CLI is MIT licensed.

---

<div align="center">

Made with ❤️ by the K9Crypt Team

[Report Bug](https://github.com/k9crypt/k9crypt-cli/issues) • [Request Feature](https://github.com/k9crypt/k9crypt-cli/issues)

</div>