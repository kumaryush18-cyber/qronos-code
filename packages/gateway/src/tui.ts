/**
 * Qronos Gateway TUI Integration
 *
 * This module provides TUI-specific functionality for qronos-gateway.
 * It requires OpenCode TUI dependencies to be injected at runtime.
 *
 * Import from "@qronos-ai/gateway/tui" for TUI features.
 */

// ============================================================================
// TUI Dependency Injection
// ============================================================================
export { initializeTUIDependencies, getTUIDependencies, areTUIDependenciesInitialized } from "./tui/context.js"
export type { TUIDependencies } from "./tui/types.js"

// ============================================================================
// TUI Helpers
// ============================================================================
export { formatProfileInfo, getOrganizationOptions, getDefaultOrganizationSelection } from "./tui/helpers.js"

// ============================================================================
// NOTE: TUI Components Moved to OpenCode
// ============================================================================
// All TUI components with JSX have been moved to packages/cli/src/qronos/
// to ensure correct JSX transpilation with @opentui/solid.
//
// Components moved:
// - registerQronosCommands -> @/qronos/qronos-commands
// - DialogQronosTeamSelect -> @/qronos/components/dialog-qronos-team-select
// - DialogQronosOrganization -> @/qronos/components/dialog-qronos-organization
// - DialogQronosProfile -> @/qronos/components/dialog-qronos-profile
// - QronosAutoMethod -> @/qronos/components/dialog-qronos-auto-method
// - QronosNews -> @/qronos/components/qronos-news
// - NotificationBanner -> @/qronos/components/notification-banner
// - DialogQronosNotifications -> @/qronos/components/dialog-qronos-notifications
