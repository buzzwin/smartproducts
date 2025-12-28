# shadcn/ui Setup Complete

shadcn/ui has been successfully installed and configured in this project.

## Installed Components

The following shadcn/ui components are available in `components/ui/`:

- **Button** - `@/components/ui/button`
- **Card** - `@/components/ui/card`
- **Badge** - `@/components/ui/badge`
- **Input** - `@/components/ui/input`
- **Label** - `@/components/ui/label`
- **Select** - `@/components/ui/select`
- **Textarea** - `@/components/ui/textarea`
- **Dialog** - `@/components/ui/dialog`
- **Dropdown Menu** - `@/components/ui/dropdown-menu`
- **Table** - `@/components/ui/table`

## Usage Example

```tsx
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Example Card</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
        <Badge variant="secondary">New</Badge>
      </CardContent>
    </Card>
  )
}
```

## Adding More Components

To add more shadcn/ui components, run:

```bash
npx shadcn@latest add [component-name]
```

For example:
```bash
npx shadcn@latest add alert
npx shadcn@latest add toast
npx shadcn@latest add tabs
```

## Configuration

- **Tailwind Config**: `tailwind.config.js`
- **shadcn Config**: `components.json`
- **Utils**: `lib/utils.ts` (contains `cn()` utility for className merging)
- **Global Styles**: `app/globals.css` (includes Tailwind directives and CSS variables)

## Available Button Variants

- `default` - Primary button
- `destructive` - For destructive actions
- `outline` - Outlined button
- `secondary` - Secondary button
- `ghost` - Ghost button
- `link` - Link-style button

## Available Button Sizes

- `default` - Standard size
- `sm` - Small
- `lg` - Large
- `icon` - Icon button

## Styling

All components use CSS variables defined in `globals.css` for theming. The design system supports:
- Light mode (default)
- Dark mode (via `.dark` class)
- Customizable colors via CSS variables

