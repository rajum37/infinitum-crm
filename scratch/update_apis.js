const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'src', 'app', 'api');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Ensure requireAuthenticatedUser is imported
  if (!content.includes('requireAuthenticatedUser') && content.includes('@/lib/auth')) {
    content = content.replace(/import \{([^}]+)\} from "@\/lib\/auth";/, (match, group) => {
      if (group.includes('requireAuthenticatedUser')) return match;
      return import {, requireAuthenticatedUser } from "@/lib/auth";;
    });
  } else if (!content.includes('@/lib/auth') && content.match(/extractTokenFromRequest|getTokenPayload/)) {
     content = import { requireAuthenticatedUser } from "@/lib/auth";\n + content;
  }

  // Replace token/payload extraction blocks
  const pattern1 = /const token = extractTokenFromRequest\(request\);\s*if \(!token\)[^\n]+\n\s*const payload = getTokenPayload\(token\);\s*if \(!payload\)[^\n]+\n/g;
  
  if (pattern1.test(content)) {
    content = content.replace(pattern1, const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: currentUser } = auth;
);
  }

  const pattern2 = /const token = extractTokenFromRequest\(request\);\s*if \(!token\)[^\n]+\n\s*const payload = getTokenPayload\(token\);\s*if \(!payload\)[^\n]+;/g;
  
  if (pattern2.test(content)) {
    content = content.replace(pattern2, const auth = await requireAuthenticatedUser(request);
    if (auth instanceof Response) return auth;
    const { payload, user: currentUser } = auth;);
  }

  // Some routes might only check token and then use requireRole, but if they extract payload, they match above.
  
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content);
    console.log(Updated: );
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('route.ts')) {
      processFile(fullPath);
    }
  }
}

walk(apiDir);
console.log("Done.");
