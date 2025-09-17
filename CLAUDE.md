# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Preview production build
npm run preview
```

## Project Architecture

This is a React + TypeScript task management application built with Vite, specifically for financial services customer task tracking.

### Core Structure

- **Frontend**: React 18 with TypeScript, React Router for navigation, Tailwind CSS for styling
- **Backend**: Supabase for database and authentication
- **State Management**: React hooks and context (no external state library)
- **UI Components**: Custom components with Lucide React icons

### Database Schema

The application uses a hierarchical task structure:
- **Customers** (`tbl_customer`) - client records with phone as primary key
- **Categories** - high-level task areas (Insurance, Investment, etc.)
- **SubCategories** - specific areas within categories
- **Tasks** - individual actionable items within subcategories
- **Team Members** (`tbl_team_member`) - servicers assigned to customers

### Key Files

- `src/lib/supabase.ts` - Database client, types, and predefined data (categories, statuses, communication methods)
- `src/services/taskService.ts` - All database queries with relationship handling and caching
- `src/App.tsx` - Main routing configuration
- `src/pages/` - Main application views (Dashboard, ServicerView, Customers, CustomerDetail)
- `src/components/Layout.tsx` - Navigation and layout wrapper

### Environment Variables

Required for Supabase connection:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

The app gracefully handles missing Supabase configuration by showing connection status.

### Development Notes

- The taskService uses a unified query approach (`fetchAllTasksWithRelationships`) then filters in memory for performance
- Servicer UUID caching reduces database calls
- Phone numbers are cleaned for comparison (removing spaces, dashes, etc.)
- Time tracking uses ISO timestamps with proper date handling via date-fns
- All database queries include proper error handling and fallback to empty arrays