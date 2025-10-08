export default {
  extends: ["@commitlint/config-conventional"],
  ignores: [
    (message) => {
      // Match dependabot commit message patterns
      const dependabotPattern =
        /^(chore|ci)\(deps(-dev)?\): bump .* from .* to .* \(#\d+\)$/;
      return dependabotPattern.test(message);
    },
  ],
};
