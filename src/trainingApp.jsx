import { useState, useEffect, useRef } from "react"
import { supabase } from "./supabase"
import ExerciseBankPage from "./pages/ExerciseBankPage"
import PlayersPage from "./pages/PlayersPage"
import CreateUserPage from "./pages/CreateUserPage"
import CoachHomePage from "./pages/CoachHomePage"
import PassBuilderPage from "./pages/PassBuilderPage"
import UsersAdminPage from "./pages/UsersAdminPage"
import TeamsPage from "./pages/TeamsPage"
import AdminHomePage from "./pages/AdminHomePage"
import CalendarPage from "./pages/CalendarPage"
import MessagesPage from "./pages/MessagesPage"
import FeedbackPage from "./pages/FeedbackPage"
import GdprPage from "./pages/GdprPage"
import StatsPage from "./pages/StatsPage"
import {
  bodyTextStyleToken,
  compactBodyTextStyleToken,
  fieldLabelStyleToken,
  flatSectionStyleToken,
  inputTextStyleToken,
  itemTitleStyleToken,
  mutedBodyTextStyleToken,
  pageEyebrowStyleToken,
  pageTitleStyleToken,
  redesignInk,
  redesignLine,
  redesignLineSoft,
  redesignMuted,
  redesignPaper,
  redesignSurface,
  redesignSurfaceSoft,
  sectionTitleStyleToken,
  subtleInsetStyleToken,
} from "./ui/redesignTokens"
import {
  getExerciseProtocolConfig,
  getExerciseProtocolStep,
  isProtocolExercise,
} from "./utils/exerciseProtocols"