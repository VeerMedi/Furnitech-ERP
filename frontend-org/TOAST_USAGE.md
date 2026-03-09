# 🎨 iOS-Style Toast Notifications

Beautiful, animated toast notifications that match your web app theme!

## 📱 Usage

### Import the toast helper
```javascript
import { toast } from '../hooks/useToast';
```

### Success Toast (Green)
```javascript
toast.success('User created successfully!');
toast.success('Changes saved!', 5000); // Custom duration
```

### Error Toast (Red)
```javascript
toast.error('Failed to save changes');
toast.error('Invalid email address');
```

### Warning Toast (Orange)
```javascript
toast.warning('Please fill all required fields');
toast.warning('Connection unstable');
```

### Info Toast (Blue)
```javascript
toast.info('New update available');
toast.info('Processing your request...');
```

## 🔄 Replace existing alerts

### Before (Old way ❌)
```javascript
alert('User created successfully!');
alert('Error creating user');
```

### After (New way ✅)
```javascript
toast.success('User created successfully!');
toast.error('Error creating user');
```

## ✨ Features

- 🎯 iOS-style spring animations
- 🎨 Matches app theme colors
- 🔄 Auto-dismiss after 3 seconds (customizable)
- ❌ Manual close button
- 📱 Mobile responsive
- ⚡ Smooth enter/exit animations
- 🎭 4 types: success, error, warning, info

## 🎬 Animation Details

- **Entry**: Slides down from top with spring effect + scale
- **Exit**: Fades out while sliding up
- **Icon**: Spins in from -180° rotation
- **Close Button**: Rotates 90° on hover

## 🎨 Colors

- **Success**: Green gradient (#10B981 → #059669)
- **Error**: Red gradient (#DC2626 → #BE123C) - Matches theme!
- **Warning**: Orange gradient (#F59E0B → #EA580C)
- **Info**: Blue gradient (#3B82F6 → #4F46E5)

## 📍 Position

- Fixed at **top center** of screen
- Stacks vertically if multiple toasts
- Auto-dismisses oldest first
- z-index: 9999 (always on top)

---

**No more boring browser alerts! 🎉**
