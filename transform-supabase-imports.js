/**
 * transform-supabase-imports.js
 *
 * From: import { ... } from '@/lib/supabase'
 * To:
 *  - import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
 *  - import { createSupabaseServerClient, createSupabaseServiceClient } from '@/lib/supabase-server'
 */

const isSupabasePath = (source) => source.value === '@/lib/supabase';

const BROWSER_NAMES = new Set(['createSupabaseBrowserClient']);
const SERVER_NAMES = new Set(['createSupabaseServerClient', 'createSupabaseServiceClient']);

module.exports = function transformer(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);

  let changed = false;

  root
    .find(j.ImportDeclaration)
    .filter((p) => isSupabasePath(p.node.source))
    .forEach((path) => {
      const specifiers = path.node.specifiers || [];
      if (specifiers.length === 0) return;

      const browserSpecs = [];
      const serverSpecs = [];
      const unknownSpecs = [];

      for (const s of specifiers) {
        if (s.type !== 'ImportSpecifier') {
          unknownSpecs.push(s);
          continue;
        }
        const importedName = s.imported.name;
        if (BROWSER_NAMES.has(importedName)) {
          browserSpecs.push(s);
        } else if (SERVER_NAMES.has(importedName)) {
          serverSpecs.push(s);
        } else {
          unknownSpecs.push(s);
        }
      }

      const newImports = [];
      if (browserSpecs.length > 0) {
        newImports.push(
          j.importDeclaration(browserSpecs, j.literal('@/lib/supabase-browser'))
        );
      }
      if (serverSpecs.length > 0) {
        newImports.push(
          j.importDeclaration(serverSpecs, j.literal('@/lib/supabase-server'))
        );
      }

      // If there were unknown specifiers, keep them on the original import for safety
      if (unknownSpecs.length > 0) {
        newImports.push(
          j.importDeclaration(unknownSpecs, j.literal('@/lib/supabase'))
        );
      }

      // Replace the original import with the new set (or remove if nothing left)
      if (newImports.length > 0) {
        j(path).replaceWith(newImports);
      } else {
        j(path).remove();
      }

      changed = true;
    });

  return changed ? root.toSource({ quote: 'single' }) : null;
};


