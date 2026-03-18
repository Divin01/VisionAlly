# VisionAlly - Employment Platform for Job Seekers with Disabilities

> Empowering job seekers with disabilities through intelligent career coaching, smart job discovery, and inclusive workplace connections.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Running the Application](#running-the-application)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)

## 🎯 Overview

VisionAlly is a React Native mobile application designed to help job seekers with disabilities find meaningful employment opportunities, prepare for interviews, and access inclusive workplaces. The app features AI-powered career coaching through Gemini 2.5 Flash API and provides features like intelligent job matching, interview preparation, CV management, and workplace accommodation tracking.

**Pillars of VisionAlly:**
1. **Smart Job Discovery** - AI-curated job opportunities matching your skills and accessibility needs
2. **Application Builder** - Streamlined application submission with CV management
3. **Application Tracker** - Track status of all submitted applications
4. **Real-Time Interview Coach** - AI-powered interview preparation and guidance
5. **Workplace Onboarding** - Post-hire support and accessibility accommodation tracking

## ✨ Features

### Core Features
- **Authentication** - Secure Firebase-based user authentication
- **AI-Powered Chat** - Real-time career coaching powered by Gemini 2.5 Flash
- **Job Management** - Browse, save, and apply to job opportunities
- **Interview Preparation** - Tips, guides, and AI coaching for interview success
- **Profile Management** - User profile with CV and job preferences
- **Job Market Insights** - Trending skills and market analysis
- **Accessibility Features** - Workplace accommodation filters and support
- **Smart Notifications** - Job recommendations and interview reminders
- **Multi-language Support** - English, Afrikaans, isiZulu, isiXhosa

### User Interface
- Beautiful gradient-based design with purple accent color (#8B5CF6)
- Responsive layouts for iOS and Android
- Smooth animations and transitions
- Professional card-based UI components

## 🛠 Tech Stack

### Frontend (React Native + Expo)
- **Framework**: React Native with Expo
- **Navigation**: React Navigation (Stack Navigator)
- **UI Components**: Expo Vector Icons, Linear Gradient
- **State Management**: React Context API (ChatContext)
- **Storage**: AsyncStorage for local persistence
- **Image Handling**: Expo Image Picker
- **Permissions**: Expo Permissions
- **Build**: Expo EAS Build

### Backend & AI
- **API Server**: Python Flask (localhost:5000)
- **AI Model**: Google Gemini 2.5 Flash API
- **Package Manager**: pip

### Database & Authentication
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Configuration**: firebase.js

### Other Services
- **Email Service**: Custom emailService.js
- **SMS Service**: Custom smsService.js
- **WhatsApp Service**: Custom whatsappService.js
- **News/Job Data**: EventRegistry API

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** or **yarn** (comes with Node.js)
- **Python** (v3.8 or higher) - [Download](https://www.python.org/)
- **Git** - [Download](https://git-scm.com/)
- **Expo CLI** - Install with: `npm install -g expo-cli`
- **Google Gemini API Key** - [Get from Google Cloud Console](https://console.cloud.google.com/)
