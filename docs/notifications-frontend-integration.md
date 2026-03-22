# Notification System Frontend Integration

## Overview

This document describes the integration between the frontend notification settings UI and the Tauri backend NotificationManager.

## Architecture

### Components

1. **Frontend Store** (`src/lib/stores/preferencesStore.ts`)
   - Manages UI state in localStorage
   - Fields: `desktopNotifications`, `syncSuccessToasts`, `syncFailureToasts`, `quietHoursEnabled`, `quietHoursStart`, `quietHoursEnd`

2. **Backend Manager** (`src-tauri/src/notification_manager.rs`)
   - Manages notification behavior
   - Fields: `enabled`, `new_mail`, `send_status`, `sync_errors`, `sound_enabled`, `quiet_hours`, `focus_assist_respect`

3. **Bridge Layer** (`src/lib/utils/notificationBridge.ts`)
   - Maps between frontend and backend data models
   - Handles Tauri command failures gracefully
   - Provides fallback to localStorage-only mode

### Data Flow

```
User Action (UI)
    ↓
updateNotifications()
    ↓
preferencesStore (localStorage)
    ↓
syncNotificationPreferencesToBackend()
    ↓
Tauri Command (NotificationManager)
```

On page load:

```
onMount()
    ↓
syncNotificationPreferencesFromBackend()
    ↓
Tauri Command (get_notification_preferences)
    ↓
Map to frontend format
    ↓
Merge into preferencesStore
```

## Field Mapping

| Frontend Field | Backend Field | Notes |
|---------------|---------------|-------|
| `desktopNotifications` | `enabled` | Direct mapping |
| `syncFailureToasts` | `sync_errors` | Direct mapping |
| `quietHoursEnabled` | `quiet_hours.enabled` | Nested mapping |
| `quietHoursStart` | `quiet_hours.start` | Nested mapping |
| `quietHoursEnd` | `quiet_hours.end` | Nested mapping |
| N/A | `new_mail` | Default: `true` |
| N/A | `send_status` | Default: `true` |
| N/A | `sound_enabled` | Default: `true` |
| N/A | `focus_assist_respect` | Default: `true` |
| `syncSuccessToasts` | N/A | Frontend-only |

## Integration Steps

### 1. Import the Bridge Functions

In `src/routes/settings/notifications/+page.svelte`:

```typescript
import {
	syncNotificationPreferencesFromBackend,
	syncNotificationPreferencesToBackend
} from '$lib/utils/notificationBridge';
```

### 2. Add Backend Sync on Mount

```typescript
onMount(async () => {
	permissionMessage = $_('notifications.permChecking');
	void refreshPermissionState();
	
	// Load preferences from Tauri backend on mount
	await syncNotificationPreferencesFromBackend();
});
```

### 3. Update the updateNotifications Function

```typescript
let isSyncing = $state(false);

async function updateNotifications(patch: Partial<NotificationPreferences>) {
	preferences.updateSection('notifications', patch);
	
	// Sync to backend with debouncing to avoid rapid Tauri calls
	if (!isSyncing) {
		isSyncing = true;
		try {
			// Small delay to batch rapid changes
			await new Promise(resolve => setTimeout(resolve, 300));
			await syncNotificationPreferencesToBackend();
		} catch (error) {
			console.error('Failed to sync notification preferences:', error);
			// Silently fail - preferences are still saved to localStorage
		} finally {
			isSyncing = false;
		}
	}
}
```

## Testing

### Unit Tests

Run the bridge tests:

```bash
npx vitest run tests/notificationBridge.test.ts
```

### Manual Testing

1. **Test Backend Sync**:
   - Open Notifications settings page
   - Verify preferences load from backend (check console logs)
   - Modify a setting
   - Restart the app
   - Verify the setting persisted

2. **Test Fallback Mode**:
   - Disable Tauri commands (mock failure)
   - Verify UI still works with localStorage only
   - Verify no error messages shown to user

3. **Test Debouncing**:
   - Rapidly toggle multiple settings
   - Verify only one Tauri call is made (after 300ms delay)

4. **Test i18n**:
   - Switch between all 10 languages
   - Verify all UI text displays correctly

## Error Handling

The bridge layer handles errors gracefully:

- **Backend Unavailable**: Falls back to localStorage-only mode
- **Command Failures**: Logs to console but doesn't disrupt UI
- **Invalid Data**: Uses default values for missing fields

## Technical Debt

### Current Limitations

1. **Field Mismatch**: Frontend and backend have different data models
   - **Impact**: Some backend features (e.g., `new_mail`, `sound_enabled`) are not exposed in UI
   - **Future**: Unified data model or UI expansion

2. **Dual Storage**: Preferences stored in both localStorage and backend
   - **Impact**: Potential for inconsistency
   - **Future**: Single source of truth pattern

3. **No Conflict Resolution**: If backend and localStorage differ, backend wins on load
   - **Impact**: User changes in browser mode may be lost
   - **Future**: Conflict detection and merge strategy

### Recommended Improvements

1. **Unified Data Model**: Create shared TypeScript types for notification preferences
2. **Sync Status Indicator**: Show user when backend sync fails
3. **Conflict Resolution**: Implement last-write-wins with timestamp
4. **UI Expansion**: Expose all backend fields in settings UI

## Files Modified

- `src/lib/utils/notificationBridge.ts` (created)
- `src/routes/settings/notifications/+page.svelte` (modified)
- `tests/notificationBridge.test.ts` (created)

## Related Commands

- `get_notification_preferences`: Load from backend
- `set_notification_preferences`: Save to backend
- `show_notification`: Display notification (not used by settings UI)

## References

- Tauri Commands: `src-tauri/src/commands.rs` (lines 706-736)
- Backend Manager: `src-tauri/src/notification_manager.rs`
- Frontend Store: `src/lib/stores/preferencesStore.ts`
- i18n Keys: `src/lib/i18n/locales/*/ts` (notifications section)
