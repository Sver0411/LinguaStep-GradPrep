/**
 * Mobile shell — entry point.
 *
 * The phone UI is split by layer so each file has one reason to change:
 *   constants.ts        static labels and reference data
 *   navigation.ts       URL helpers shared by every screen
 *   ui/                 generic pieces with no screen knowledge
 *   screens/            one file per screen
 *   MobileApp.tsx       shell: route dispatch + tab bar
 */
export { MobileApp } from "./MobileApp";
