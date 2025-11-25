// apps/mobile/expo-entry.js
import 'expo-dev-client';
import 'expo-modules-core';
import { registerRootComponent } from 'expo';

import App from './App'; // este es tu App.tsx raíz

registerRootComponent(App);