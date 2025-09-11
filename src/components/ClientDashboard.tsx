import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, MessageCircle, FolderOpen, Settings, LogOut, Search, ChevronRight, FileText, Image as ImageIcon, ExternalLink, Clock, CheckCircle, AlertTriangle, X, Edit, Trash2, Send, Filter, Download, Eye, User, Building2, Mail, Phone, Calendar, Tag, DollarSign, Star, Archive, Bell, Plus, MoreVertical, Reply, Forward, Paperclip, Save, RefreshCw, Home, Kanban, GraduationCap, Code, BookOpen, UserCheck, FileSignature, ClipboardList, BarChart3, TrendingUp, Zap, Link, Upload, Database, Globe, Shield, Award, Target, PieChart, Activity, Workflow, UserPlus, FileCheck, FileSignature as Signature, QrCode, Printer, Calculator, CreditCard, Briefcase, School, AlignCenterVertical as Certificate, Users2, MessageSquare, UploadCloud as CloudUpload, HardDrive, Folder, Share2, Lock, Key, Monitor, Smartphone, Server, Cloud, Cpu, Network, ClipboardCheck, ChevronDown, ChevronUp, ArrowRight, ArrowLeft, Copy, Layers, Grid, List, SortAsc, SortDesc, Calendar as CalendarIcon, Clock as ClockIcon, AlertCircle, Info, HelpCircle, Maximize2, Minimize2, RotateCcw, RotateCw, ZoomIn, ZoomOut, Move, Resize, CornerDownRight, Hash, AtSign, Bookmark, Flag, Paperclip as AttachIcon, MessageCircle as CommentIcon, Timer, Play, Pause, Square, SkipForward, SkipBack, Volume2, VolumeX, Mic, MicOff, Video, VideoOff, Phone as PhoneIcon, PhoneCall, PhoneIncoming, PhoneOutgoing, PhoneMissed, Voicemail, Headphones, Speaker, Radio, Tv, Camera, Image, Film, Music, Disc, Cassette, Radio as RadioIcon, Podcast, Rss, Wifi, WifiOff, Bluetooth, BluetoothConnected, Usb, HardDrive as DriveIcon, SdCard, Smartphone as MobileIcon, Tablet, Laptop, Monitor as ScreenIcon, Tv2, Gamepad, Gamepad2, Joystick, Dices, Puzzle, Target as TargetIcon, Crosshair, Zap as BoltIcon, Battery, BatteryCharging, BatteryFull, BatteryLow, Power, PowerOff, Plug, PlugZap, Cable, Ethernet, Router, Modem, Satellite, Antenna, Signal, SignalHigh, SignalLow, SignalMedium, SignalZero, Radar, Sonar, Compass, Navigation, Map, MapPin, Navigation2, Route, Milestone, Signpost, RoadSign, TrafficCone, Construction, Hammer, Wrench, Screwdriver, Drill, Saw, Ruler, Scissors, PaintBucket, Brush, Palette, Pipette, Eyedropper, Swatch, Contrast, Brightness, Sun, Moon, CloudSun, CloudMoon, CloudRain, CloudSnow, CloudLightning, CloudDrizzle, CloudHail, Tornado, Hurricane, Thermometer, Droplets, Wind, Snowflake, Umbrella, UmbrellaBeach, Waves, Mountain, MountainSnow, Volcano, Desert, Forest, Tree, TreePine, Flower, Flower2, Leaf as LeafIcon, Seedling, Sprout, Cherry, Apple as AppleIcon, Banana, Grape, Orange, Lemon, Strawberry, Carrot, Corn, Wheat, Rice, Bread, Croissant, Bagel, Pretzel, Pizza, Hamburger, HotDog, Sandwich, Taco, Burrito, Salad, Soup, Stew, Cake, Cookie, Candy, Chocolate, IceCream, Donut, Pie, Coffee, Tea, Wine, Beer, Cocktail, Martini, Champagne, Bottle, Glass, Cup, Mug, Utensils, Fork, Knife, Spoon, ChefHat, Cooking, Oven, Microwave, Refrigerator, Blender, Toaster, Kettle, Pot, Pan, Plate, Bowl, Napkin, Tablecloth, Candle, Fireplace, Fire, Flame, Lighter, Match, Cigarette, Smoking, NoSmoking, Recycle, Trash, Trash2 as TrashIcon, Delete, Eraser, Backspace, Undo, Redo, Cut, Copy as CopyIcon, Paste, Clipboard, ClipboardCopy, ClipboardPaste, ClipboardList as ClipboardListIcon, ClipboardCheck as ClipboardCheckIcon, ClipboardX, ClipboardEdit, ClipboardSignature, FileText as FileIcon, File, FileImage, FileVideo, FileAudio, FilePdf, FileSpreadsheet, FileCode, FileArchive, FileKey, FileLock, FileUnlock, FileSearch, FileEdit, FilePlus, FileMinus, FileX, FileCheck as FileCheckIcon, FileWarning, FileQuestion, FileExclamation, FileHeart, FileStar, FileBarChart, FilePieChart, FileLineChart, FileAreaChart, FileScatter, FileBadge, FileCertificate, FileDiploma, FileGraduationCap, FileUser, FileUsers, FileBuilding, FileFactory, FileOffice, FileHome, FileHouse, FileCar, FileTruck, FileBus, FileTrain, FilePlane, FileBoat, FileShip, FileRocket, FileSatellite, FileGlobe, FileMap, FileCompass, FileRoute, FileMilestone, FileFlag, FileBookmark, FileTag, FileHash, FileAt, FilePercent, FileDollar, FileEuro, FilePound, FileYen, FileRupee, FileBitcoin, FileWallet, FileCreditCard, FileBank, FileBuilding2, FileStore, FileShop, FileCart, FileBag, FileBox, FilePackage, FileGift, FilePresent, FileBalloon, FileParty, FileCelebration, FileConfetti, FileFireworks, FileStar as FileStarIcon, FileHeart as FileHeartIcon, FileLike, FileDislike, FileThumbsUp, FileThumbsDown, FileSmile, FileFrown, FileMeh, FileAngry, FileSad, FileHappy, FileLaugh, FileCry, FileKiss, FileWink, FileTongue, FileNeutral, FileAstonished, FileFlushed, FileHushed, FileSleepy, FileTired, FileDizzy, FileFearful, FileWorried, FileAnxious, FileRelieved, FileContent, FilePensive, FileConfused, FileUnamused, FileRollingEyes, FileExpressionless, FileNeutralFace, FileNoMouth, FileZipper, FileMute, FileLoud, FileQuiet, FileSilent, FileNoise, FileSound, FileVolume, FileVolumeUp, FileVolumeDown, FileVolumeMute, FileVolumeOff, FileHeadphones, FileSpeaker, FileMicrophone, FileRadio, FilePodcast, FileMusic as FileMusicIcon, FileNote, FileNotes, FileNotebook, FileJournal, FileDiary, FileCalendar, FileSchedule, FileAgenda, FileAppointment, FileMeeting, FileEvent, FileReminder, FileAlarm, FileTimer, FileStopwatch, FileClock, FileWatch, FileHourglass, FileSandClock, FileSunrise, FileSunset, FileMorning, FileEvening, FileNight, FileDay, FileWeek, FileMonth, FileYear, FileDecade, FileCentury, FileMillennium, FileEternity, FileInfinity, FileForever, FileAlways, FileNever, FileOnce, FileTwice, FileThrice, FileMany, FileFew, FileSome, FileAll, FileNone, FileEmpty, FileFull, FileHalf, FileQuarter, FileThird, FileFifth, FileTenth, FilePercent as FilePercentIcon, FileFraction, FileRatio, FileProportion, FileScale, FileBalance, FileWeight, FileMass, FileVolume as FileVolumeIcon, FileArea, FileLength, FileWidth, FileHeight, FileDepth, FileDistance, FileSpeed, FileVelocity, FileAcceleration, FileForce, FilePressure, FileTemperature, FileHeat, FileCold, FileWarm, FileCool, FileHot, FileFreeze, FileMelt, FileBoil, FileSteam, FileIce, FileSnow, FileRain, FileStorm, FileThunder, FileLightning, FileWind as FileWindIcon, FileTornado, FileHurricane, FileEarthquake, FileVolcano as FileVolcanoIcon, FileFlood, FileDrought, FileFamine, FilePlague, FileWar, FilePeace, FileLove, FileHate, FileJoy, FileSorrow, FileHope, FileFear, FileAnger, FileCalm, FileExcitement, FileBoredom, FileCuriosity, FileWonder, FileAmazement, FileSurprise, FileShock, FileDisbelief, FileSkepticism, FileTrust, FileDistrust, FileConfidence, FileDoubt, FileCertainty, FileUncertainty, FileKnowledge, FileIgnorance, FileWisdom, FileFoolishness, FileIntelligence, FileStupidity, FileGenius, FileIdiot, FileSmart, FileDumb, FileClever, FileNaive, FileCunning, FileInnocent, FileGuilty, FileInnocence, FileGuilt, FileShame, FilePride, FileHumility, FileArrogance, FileModesty, FileVanity, FileHonesty, FileDeceit, FileTruth, FileLie, FileReality, FileFiction, FileFact, FileOpinion, FileBeliefSystem, FileIdeology, FilePhilosophy, FileReligion, FileScience, FileArt, FileLiterature, FilePoetry, FileMusic2, FileDance, FileTheater, FileCinema, FilePhotography, FilePainting, FileSculpture, FileArchitecture, FileDesign, FileFashion, FileStyle, FileTrend, FileClassic, FileModern, FileVintage, FileRetro, FileAntique, FileNew, FileOld, FileFresh, FileStale, FileClean, FileDirty, FilePure, FileCorrupt, FileGood, FileBad, FileRight, FileWrong, FileCorrect, FileIncorrect, FileTrue, FileFalse, FileYes, FileNo, FileMaybe, FilePerhaps, FilePossibly, FileProbably, FileDefinitely, FileCertainly, FileAbsolutely, FileNever2, FileAlways2, FileSometimes, FileOften, FileRarely, FileSeldom, FileFrequently, FileOccasionally, FileRegularly, FileIrregularly, FilePeriodically, FileContinuously, FileConstantly, FilePermanently, FileTemporarily, FileBriefly, FileMomentarily, FileInstantly, FileImmediately, FileSoon, FileLater, FileEventually, FileFinally, FileUltimately, FileOriginally, FileInitially, FilePreviously, FileFormerly, FileCurrently, FilePresently, FileNow, FileThen, FileWhen, FileWhere, FileWhy, FileHow, FileWhat, FileWho, FileWhich, FileWhose, FileWhom, FileWhomever, FileWhoever, FileWhatever, FileWhenever, FileWherever, FileHowever, FileWhy2, FileBecause, FileSince, FileAs, FileWhile, FileDuring, FileBefore, FileAfter, FileUntil, FileTill, FileUnless, FileIf, FileWhether, FileAlthough, FileThough, FileEven, FileStill, FileYet, FileAlready, FileJust, FileOnly, FileEven2, FileAlso, FileToo, FileEither, FileNeither, FileBoth, FileAll2, FileEvery, FileEach, FileAny, FileSome2, FileMany2, FileFew2, FileSeveral, FileNumerous, FileCountless, FileInfinite, FileEndless, FileLimitless, FileBoundless, FileUnlimited, FileRestricted, FileLimited, FileBounded, FileFinite, FileSmall, FileLarge, FileBig, FileTiny, FileHuge, FileGigantic, FileEnormous, FileMassive, FileImmense, FileColossal, FileMicroscopic, FileMiniature, FileCompact, FileSpacious, FileNarrow, FileWide, FileThin, FileThick, FileShallow, FileDeep, FileHigh, FileLow, FileTall, FileShort, FileLong, FileBrief, FileExtended, FileExpanded, FileContracted, FileStretched, FileCompressed, FileInflated, FileDeflated, FileSwollen, FileShrunk, FileGrown, FileReduced, FileIncreased, FileDecreased, FileRaised, FileLowered, FileLifted, FileDropped, FilePushed, FilePulled, FileDragged, FileCarried, FileHeld, FileGrasped, FileReleased, FileThrown, FileCaught, FileKicked, FileHit, FileStruck, FileTouched, FileFelt, FilePressed, FileSqueezed, FilePinched, FileTickled, FileScratched, FileRubbed, FilePatted, FileStroked, FileMassaged, FileHugged, FileKissed, FileLicked, FileBitten, FileChewed, FileSwallowed, FileTasted, FileSmelled, FileSniffed, FileHeard, FileListened, FileSaw, FileWatched, FileLooked, FileStared, FileGlanced, FilePeeked, FileSpied, FileObserved, FileNoticed, FileSpotted, FileDetected, FileDiscovered, FileFound, FileLost, FileMissed, FileIgnored, FileOverlooked, FileForgotten, FileRemembered, FileRecalled, FileRecognized, FileIdentified, FileNamed, FileCalled, FileLabeled, FileTagged, FileMarked, FileSigned, FileStamped, FilePrinted, FileWritten, FileTyped, FileDrawn, FilePainted, FileColored, FileShaded, FileHighlighted, FileUnderlined, FileCrossed, FileDeleted as FileDeletedIcon, FileErased, FileRemoved, FileEliminated, FileDestroyed, FileRuined, FileDamaged, FileBroken, FileFixed, FileRepaired, FileRestored, FileRenewed, FileRefreshed, FileUpdated, FileModified, FileChanged, FileAltered, FileAdjusted, FileTuned, FileCalibrated, FileConfigured, FileSetup, FileInstalled, FileUninstalled, FileDownloaded, FileUploaded, FileSent, FileReceived, FileDelivered, FileShipped, FileTransported, FileMoved, FileTransferred, FileCopied, FileDuplicated, FileCloned, FileBackedUp, FileSaved, FileStored, FileArchived, FileCompressed as FileCompressedIcon, FileExtracted, FileUnzipped, FileZipped, FilePacked, FileUnpacked, FileWrapped, FileUnwrapped, FileSealed, FileUnsealed, FileLocked, FileUnlocked, FileEncrypted, FileDecrypted, FileProtected, FileUnprotected, FileSecured, FileUnsecured, FileSafe, FileUnsafe, FilePrivate, FilePublic, FileHidden, FileVisible, FileShown, FileDisplayed, FilePresented, FileExhibited, FileDemonstrated, FileRevealed, FileExposed, FileCovered, FileConcealed, FileMasked, FileUnmasked, FileDisguised, FileUndisguised, FileCamouflaged, FileUncamouflaged, FileObscured, FileUnobscured, FileClarified, FileUnclarified, FileExplained, FileUnexplained, FileUnderstood, FileMisunderstood, FileInterpreted, FileMisinterpreted, FileTranslated, FileUntranslated, FileConverted, FileUnconverted, FileTransformed, FileUntransformed, FileProcessed, FileUnprocessed, FileRefined, FileUnrefined, FilePurified, FileUnpurified, FileFiltered, FileUnfiltered, FileSorted, FileUnsorted, FileOrganized, FileDisorganized, FileArranged, FileDisarranged, FileStructured, FileUnstructured, FileFormatted, FileUnformatted, FileStyled, FileUnstyled, FileDecorated, FileUndecorated, FileOrnamented, FileUnornamented, FileEmbellished, FileUnembellished, FileEnhanced, FileUnenhanced, FileImproved, FileUnimproved, FileOptimized, FileUnoptimized, FileMaximized, FileMinimized, FileExpanded as FileExpandedIcon, FileCollapsed, FileOpened, FileClosed, FileStarted, FileStopped, FilePaused, FileResumed, FileContinued, FileDiscontinued, FileFinished, FileUnfinished, FileCompleted, FileIncomplete, FileDone, FileUndone, FileAchieved, FileUnachieved, FileAccomplished, FileUnaccomplished, FileSucceeded, FileFailed, FileWon, FileLost2, FileGained, FileLost3, FileEarned, FileSpent, FilePaid, FileUnpaid, FileOwed, FileBorrowed, FileLent, FileInvested, FileWithdrawn, FileDeposited, FileSaved2, FileWasted, FileUsed, FileUnused, FileConsumed, FileUnconsumed, FileExhausted, FileUnexhausted, FileDepleted, FileUndepleted, FileEmpty2, FileFull2, FilePartial, FileComplete, FileIncomplete2, FileWhole, FilePart, FilePiece, FileFragment, FileSegment, FileSection, FileChapter, FilePage, FileLine, FileWord, FileLetter, FileCharacter, FileSymbol, FileNumber, FileDigit, FileFigure, FileStatistic, FileData, FileInformation, FileKnowledge2, FileFact2, FileDetail, FileSpecific, FileGeneral, FileParticular, FileSpecial, FileOrdinary, FileCommon, FileRare, FileUnique, FileTypical, FileAtypical, FileNormal, FileAbnormal, FileRegular, FileIrregular, FileStandard, FileNonStandard, FileConventional, FileUnconventional, FileTraditional, FileNonTraditional, FileClassical, FileModern2, FileContemporary, FileAncient, FileOld2, FileNew2, FileFresh2, FileRecent, FileLatest, FileEarliest, FileFirst, FileLast, FileNext, FilePrevious, FileForward, FileBackward, FileUp, FileDown, FileLeft, FileRight, FileNorth, FileSouth, FileEast, FileWest, FileNortheast, FileNorthwest, FileSoutheast, FileSouthwest, FileCenter, FileMiddle, FileTop, FileBottom, FileFront, FileBack, FileInside, FileOutside, FileAbove, FileBelow, FileOver, FileUnder, FileBeside, FileNear, FileFar, FileClose, FileDistant, FileAdjacent, FileOpposite, FileParallel, FilePerpendicular, FileDiagonal, FileHorizontal, FileVertical, FileSlanted, FileTilted, FileRotated, FileFlipped, FileReversed, FileInverted, FileMirrored, FileReflected, FileSymmetrical, FileAsymmetrical, FileBalanced, FileUnbalanced, FileStable, FileUnstable, FileSteady, FileUnsteady, FileFixed2, FileMovable, FileStatic, FileDynamic, FileActive, FileInactive, FileLive, FileDead, FileAlive, FileLifeless, FileAnimated, FileInanimate, FileMoving, FileStationary, FileFlowing, FileStagnant, FileRunning, FileWalking, FileStanding, FileSitting, FileLying, FileSleeping, FileAwake, FileAlert, FileDrowsy, FileTired2, FileEnergetic, FileLazy, FileBusy, FileIdle, FileWorking, FileResting, FileRelaxing, FileStressed, FileTense, FileCalm2, FilePeaceful, FileSerene, FileTranquil, FileQuiet2, FileLoud2, FileNoisy, FileSilent2, FileWhispering, FileShouting, FileScreaming, FileCrying, FileLaughing, FileSmiling, FileFrowning, FileGrinning, FilePouting, FileWinking, FileBlinking, FileStaring, FileGazing, FileLooking2, FileWatching2, FileObserving, FileExamining, FileInspecting, FileStudying, FileAnalyzing, FileEvaluating, FileAssessing, FileJudging, FileCriticizing, FilePraising, FileComplimenting, FileInsulting, FileOffending, FileHurting, FileHealing, FileHelping, FileHindering, FileSupporting, FileOpposing, FileAgreeing, FileDisagreeing, FileAccepting, FileRejecting, FileApproving, FileDisapproving, FileAllowing, FileForbidding, FilePermitting, FileProhibiting, FileEnabling, FileDisabling, FileActivating, FileDeactivating, FileTurningOn, FileTurningOff, FileSwitchingOn, FileSwitchingOff, FileOpening, FileClosing2, FileStarting, FileStopping2, FilePausing, FileResuming, FileContinuing, FileDiscontinuing2, FileBeginning, FileEnding, FileCommencing, FileTerminating, FileInitiating, FileConcluding, FileLaunching, FileShuttingDown, FileBooting, FileRebooting, FileRestarting, FileRefreshing, FileReloading, FileUpdating2, FileUpgrading, FileDowngrading, FileInstalling, FileUninstalling2, FileConfiguring, FileReconfiguring, FileCustomizing, FilePersonalizing, FileAdapting, FileAdjusting2, FileModifying2, FileChanging2, FileAltering2, FileTweaking, FileFinetuning, FileOptimizing2, FileImproving2, FileEnhancing2, FileUpgrading2, FileDowngrading2, FileProgressing, FileRegressing, FileAdvancing, FileRetreating, FileMovingForward, FileMovingBackward, FileGoingUp, FileGoingDown, FileRising, FileFalling, FileClimbing, FileDescending, FileAscending, FileElevating, FileLowering, FileLifting, FileDropping2, FileRaising, FileReducing2, FileIncreasing2, FileDecreasing2, FileGrowing, FileShrinking, FileExpanding2, FileContracting2, FileStretching, FileCompressing2, FileInflating, FileDeflating, FileSwelling, FileSubsiding, FileBulging, FileFlattening, FileRounding, FileSharpening, FileDulling, FileBrightening, FileDarkening, FileLightening, FileHeavying, FileWeightening, FileLightweighting, FileHeavyweighting, FileStrengthening, FileWeakening, FileHardening, FileSoftening, FileStiffening, FileLoosening, FileTightening, FileSlackening, FileFirmening, FileRelaxing2, FileTensing, FileStressing, FileCalming3, FileSoothing, FileComforting, FileDisturbing, FileUpsetting, FileAnnoying, FileIrritating, FileBothering, FileTroubling, FileWorrying, FileConcerning, FileAlarming, FileScaring, FileFrightening, FileTerrifying, FileHorrifying, FileShocking2, FileStartling, FileSurprising2, FileAmazing, FileAstonishing, FileStunning, FileBewildering, FileConfusing2, FilePuzzling, FilePerplexing, FileBaffling, FileMystifying, FileIntriguing, FileFascinating, FileCaptivating, FileEngaging, FileAbsorbing, FileEngrossing, FileRiveting, FileGripping, FileCompelling, FileEnthralling, FileSpellbinding, FileMesmerizing, FileHypnotizing, FileEnchanting, FileCharming, FileDelightful, FilePleasant, FileEnjoyable, FileFun, FileEntertaining, FileAmusing, FileHumorous, FileFunny, FileComical, FileHilarious, FileLaughable, FileRidiculous, FileAbsurd, FileNonsensical, FileSenseless, FileMeaningless, FileMeaningful, FileSignificant, FileInsignificant, FileImportant, FileUnimportant, FileRelevant, FileIrrelevant, FileUseful, FileUseless, FileValuable, FileWorthless, FilePrecious, FileWorthwhile, FileBeneficial, FileHarmful, FileHelpful2, FileHarmless, FileDangerous, FileSafe2, FileRisky, FileSecure2, FileInsecure, FileProtected2, FileVulnerable, FileStrong, FileWeak, FilePowerful, FilePowerless, FileInfluential, FileInfluenceless, FileEffective, FileIneffective, FileEfficient, FileInefficient, FileProductive, FileUnproductive, FileSuccessful, FileUnsuccessful, FileProfitable, FileUnprofitable, FileAdvantaged, FileDisadvantaged, FileFavored, FileUnfavored, FilePreferred, FileUnpreferred, FileLiked, FileDisliked, FileLoved, FileHated2, FileAdored, FileDespised, FileRespected, FileDisrespected, FileAdmired, FileLoathed, FileAppreciated, FileUnappreciated, FileValued, FileUnvalued, FileTreasured, FileNeglected, FileCherished, FileAbandoned, FileEmbraced, FileRejected2, FileAccepted2, FileWelcomed, FileUnwelcomed, FileInvited, FileUninvited, FileIncluded, FileExcluded, FileInvolved, FileUninvolved, FileParticipating, FileNonParticipating, FileEngaged2, FileDisengaged, FileCommitted, FileUncommitted, FileDedicated, FileUndedicated, FileDevoted, FileUndevoted, FileFaithful, FileUnfaithful, FileLoyal, FileDisloyal, FileTrustworthy, FileUntrustworthy, FileReliable, FileUnreliable, FileDependable, FileUndependable, FileConsistent, FileInconsistent, FilePredictable, FileUnpredictable, FileStable2, FileUnstable2, FileSteady2, FileUnsteady2, FileConstant, FileInconstant, FileVariable, FileInvariable, FileChangeable, FileUnchangeable, FileMutable, FileImmutable, FileFlexible, FileInflexible, FileAdaptable, FileUnadaptable, FileAdjustable, FileUnadjustable, FileModifiable, FileUnmodifiable, FileAlterable, FileUnalterable, FileReversible, FileIrreversible, FilePermanent2, FileTemporary2, FileLasting, FileTransient, FileEnduring, FileFleeting, FilePersistent, FileEphemeral, FileEternal, FileMortal, FileImmortal, FileInfinite2, FileFinite2, FileLimited2, FileUnlimited2, FileBounded2, FileUnbounded, FileRestricted2, FileUnrestricted, FileConstrained, FileUnconstrained, FileControlled, FileUncontrolled, FileRegulated, FileUnregulated, FileManaged, FileUnmanaged, FileSupervised, FileUnsupervised, FileGuided, FileUnguided, FileDirected, FileUndirected, FileLed, FileUnled, FileFollowed, FileUnfollowed, FileTracked, FileUntracked, FileMonitored, FileUnmonitored, FileWatched3, FileUnwatched, FileObserved2, FileUnobserved, FileNoticed2, FileUnnoticed, FileDetected2, FileUndetected, FileDiscovered2, FileUndiscovered, FileFound2, FileUnfound, FileLocated, FileUnlocated, FilePositioned, FileUnpositioned, FilePlaced, FileUnplaced, FileSet, FileUnset, FileEstablished, FileUnestablished, FileCreated, FileUncreated, FileMade, FileUnmade, FileBuilt, FileUnbuilt, FileConstructed, FileUnconstructed, FileAssembled, FileDisassembled, FileManufactured, FileUnmanufactured, FileProduced, FileUnproduced, FileGenerated, FileUngenerated, FileDeveloped, FileUndeveloped, FileEvolved, FileUnevolved, FileGrown2, FileUngrown, FileMatured, FileUnmatured, FileRipened, FileUnripened, FileAged, FileUnaged, FileWeathered, FileUnweathered, FileWorn, FileUnworn, FileUsed2, FileUnused2, FileUtilized, FileUnutilized, FileEmployed, FileUnemployed, FileApplied, FileUnapplied, FileImplemented, FileUnimplemented, FileExecuted, FileUnexecuted, FilePerformed, FileUnperformed, FileCarriedOut, FileNotCarriedOut, FileAccomplished2, FileUnaccomplished2, FileAchieved2, FileUnachieved2, FileRealized, FileUnrealized, FileFulfilled, FileUnfulfilled, FileCompleted2, FileIncompleted, FileFinished2, FileUnfinished2, FileDone2, FileUndone2, FileOver, FileUnder2, FileAbove2, FileBelow2, FileOn, FileOff, FileIn, FileOut, FileInto, FileOutOf, FileThrough, FileAround, FileAcross, FileAlong, FileBetween, FileAmong, FileWithin, FileWithout, FileWith, FileAgainst, FileFor, FileAgainst2, FilePro, FileCon, FileYes2, FileNo2, FileTrue2, FileFalse2, FileRight2, FileWrong2, FileCorrect2, FileIncorrect2, FileAccurate, FileInaccurate, FilePrecise, FileImprecise, FileExact, FileInexact, FileSpecific2, FileGeneral2, FileDetailed, FileVague, FileClear, FileUnclear, FileObvious, FileObscure, FileEvident, FileUnevident, FileApparent, FileUnapparent, FileVisible2, FileInvisible, FileTransparent, FileOpaque, FileTranslucent, FileOpaque2, FileCloudy, FileClear2, FileMuddy, FileClean2, FileDirty2, FilePure2, FileImpure, FileContaminated, FileUncontaminated, FilePolluted, FileUnpolluted, FileTainted, FileUntainted, FileCorrupted, FileUncorrupted, FileInfected, FileUninfected, FileDisease, FileHealthy, FileSick, FileWell, FileIll, FileRecovered, FileHealed2, FileInjured, FileUninjured, FileHurt2, FileUnhurt, FilePained, FileUnpained, FileSuffering, FileNotSuffering, FileComfortable, FileUncomfortable, FileCozy, FileUncozy, FileWarm2, FileCold2, FileHot2, FileCool2, FileFreezing, FileBoiling2, FileScorching, FileChilly, FileMild, FileExtreme, FileModerate, FileIntense, FileGentle, FileHarsh, FileSoft, FileHard, FileSmooth, FileRough, FileFlat, FileBumpy, FileEven, FileUneven, FileLevel, FileUnlevel, FileStraight, FileCrooked, FileBent, FileUnbent, FileCurved, FileUncurved, FileTwisted, FileUntwisted, FileCoiled, FileUncoiled, FileWound, FileUnwound, FileWrapped2, FileUnwrapped2, FileFolded, FileUnfolded, FileCreased, FileUncreased, FileWrinkled, FileUnwrinkled, FileSmoothed, FileRoughened, FilePolished, FileUnpolished, FileRefined2, FileUnrefined2, FileFinished3, FileUnfinished3, FileCompleted3, FileIncompleted2, FilePerfected, FileImperfected, FileFlawless, FileFlawed, FilePerfect, FileImperfect, FileIdeal, FileNonIdeal, FileOptimal, FileSuboptimal, FileBest, FileWorst, FileBetter, FileWorse, FileSuper, FileInferior, FileSuperior, FileInferior2, FileExcellent, FilePoor, FileGood2, FileBad2, FileGreat, FileTerrible, FileWonderful, FileAwful, FileFabulous, FileHorrible, FileAmazing2, FileDisgusting, FileIncredible, FileUnbelievable, FileRemarkable, FileUnremarkable, FileExtraordinary, FileOrdinary2, FileExceptional, FileUnexceptional, FileOutstanding, FileUnoutstanding, FileNotable, FileUnnotable, FileDistinguished, FileUndistinguished, FileProminent, FileUnprominent, FileFamous, FileUnfamous, FileRenowned, FileUnrenowned, FileCelebrated, FileUncelebrated, FileAcclaimed, FileUnacclaimed, FilePraised, FileUnpraised, FileHonored, FileUnhonored, FileRespected2, FileDisrespected2, FileRevered, FileUnrevered, FileWorshipped, FileUnworshipped, FileAdored2, FileUnadorned, FileBeloved, FileUnbeloved, FileDear, FileUndear, FilePrecious2, FileUnprecious, FileValuable2, FileWorthless2, FilePriceless, FileWorthless3, FileCostly, FileInexpensive, FileExpensive, FileCheap, FileAffordable, FileUnaffordable, FileFree, FilePaid2, FileCharged, FileUncharged, FileBilled, FileUnbilled, FileInvoiced, FileUninvoiced, FileOwed2, FileUnowed, FileDue, FileOverdue, FilePaid3, FileUnpaid2, FileSettled, FileUnsettled, FileCleared, FileUncleared, FileResolved, FileUnresolved, FileSolved, FileUnsolved, FileAnswered, FileUnanswered, FileReplied, FileUnreplied, FileResponded, FileUnresponded, FileAcknowledged, FileUnacknowledged, FileConfirmed, FileUnconfirmed, FileVerified, FileUnverified, FileValidated, FileInvalidated, FileAuthenticated, FileUnauthenticated, FileAuthorized, FileUnauthorized, FileApproved2, FileUnapproved, FileCertified, FileUncertified, FileLicensed, FileUnlicensed, FileRegistered, FileUnregistered, FileEnrolled, FileUnenrolled, FileSubscribed, FileUnsubscribed, FileMember, FileNonMember, FileJoined, FileUnjoined, FileConnected, FileDisconnected, FileLinked, FileUnlinked, FileAttached, FileDetached, FileBound, FileUnbound, FileTied, FileUntied, FileFastened, FileUnfastened, FileSecured2, FileUnsecured2, FileAnchored, FileUnanchored, FileGrounded, FileUngrounded, FileRooted, FileUprooted, FileEstablished2, FileUnestablished2, FileSettled2, FileUnsettled2, FileStabilized, FileDestabilized, FileBalanced2, FileUnbalanced2, FileEquilibrium, FileDisequilibrium, FileHarmony, FileDisharmony, FileOrder, FileDisorder, FileOrganization, FileDisorganization, FileStructure, FileUnstructure, FileSystem, FileNonSystem, FileMethod, FileNonMethod, FileProcess, FileNonProcess, FileProcedure, FileNonProcedure, FileProtocol, FileNonProtocol, FileStandard2, FileNonStandard2, FileRule, FileException, FileRegulation, FileDeregulation, FileLaw, FileOutlaw, FilePolicy, FileNonPolicy, FileGuideline, FileNonGuideline, FileInstruction, FileNonInstruction, FileDirection, FileNonDirection, FileGuidance, FileNonGuidance, FileAdvice, FileNonAdvice, FileRecommendation, FileNonRecommendation, FileSuggestion, FileNonSuggestion, FileProposal, FileNonProposal, FileOffer, FileNonOffer, FileRequest, FileNonRequest, FileDemand, FileNonDemand, FileRequirement, FileNonRequirement, FileNeed, FileNonNeed, FileWant, FileNonWant, FileDesire, FileNonDesire, FileWish, FileNonWish, FileHope2, FileNonHope, FileDream, FileNightmare, FileFantasy, FileReality2, FileImagination, FileNonImagination, FileCreativity, FileNonCreativity, FileInnovation, FileNonInnovation, FileInvention, FileNonInvention, FileDiscovery, FileNonDiscovery, FileExploration, FileNonExploration, FileInvestigation, FileNonInvestigation, FileResearch, FileNonResearch, FileStudy, FileNonStudy, FileExamination, FileNonExamination, FileInspection, FileNonInspection, FileObservation, FileNonObservation, FileAnalysis, FileNonAnalysis, FileEvaluation, FileNonEvaluation, FileAssessment, FileNonAssessment, FileJudgment, FileNonJudgment, FileCriticism, FileNonCriticism, FileReview, FileNonReview, FileComment, FileNonComment, FileFeedback, FileNonFeedback, FileResponse, FileNonResponse, FileReaction, FileNonReaction, FileAnswer2, FileNonAnswer, FileSolution, FileNonSolution, FileResolution, FileNonResolution, FileConclusion, FileNonConclusion, FileDecision, FileIndecision, FileChoice, FileNonChoice, FileOption, FileNonOption, FileAlternative, FileNonAlternative, FilePossibility, FileImpossibility, FileProbability, FileImprobability, FileChance, FileNonChance, FileOpportunity, FileNonOpportunity, FileAdvantage, FileDisadvantage, FileBenefit, FileNonBenefit, FileProfit, FileNonProfit, FileGain, FileNonGain, FileLoss, FileNonLoss, FileWin, FileNonWin, FileVictory, FileDefeat, FileSuccess, FileFailure, FileTriumph, FileDisaster, FileAchievement, FileNonAchievement, FileAccomplishment, FileNonAccomplishment, FileAttainment, FileNonAttainment, FileFulfillment, FileNonFulfillment, FileRealization, FileNonRealization, FileCompletion, FileNonCompletion, FileFinalization, FileNonFinalization, FileConclusion2, FileNonConclusion2, FileTermination, FileNonTermination, FileEnd, FileNonEnd, FileFinish, FileNonFinish, FileStop, FileNonStop, FileCease, FileNonCease, FileHalt, FileNonHalt, FilePause2, FileNonPause, FileBreak, FileNonBreak, FileRest2, FileNonRest, FileRelax3, FileNonRelax, FileCalm4, FileNonCalm, FilePeace2, FileNonPeace, FileQuiet3, FileNonQuiet, FileSilence, FileNonSilence, FileStillness, FileNonStillness, FileMotionless, FileNonMotionless, FileStationary2, FileNonStationary, FileImmobile, FileMobile, FileFixed3, FileUnfixed, FileStuck, FileUnstuck, FileFrozen, FileUnfrozen, FileSolid, FileLiquid, FileGas, FilePlasma, FileVapor, FileSteam2, FileSmoke, FileFog, FileMist, FileCloud, FileCloudy2, FileSunny, FileRainy, FileSnowy, FileStormy, FileWindy, FileCalm5, FileStill, FileQuiet4, FileLoud3, FileNoisy2, FileSilent3, FileVocal, FileNonVocal, FileSpoken, FileUnspoken, FileVerbal, FileNonVerbal, FileOral, FileWritten2, FileTyped2, FilePrinted2, FileHandwritten, FileDigital, FileAnalog, FileElectronic, FileMechanical, FileAutomatic, FileManual, FileAutomated, FileNonAutomated, FileProgrammed, FileUnprogrammed, FileCoded, FileUncoded, FileScripted, FileUnscripted, FileCompiled, FileUncompiled, FileExecuted2, FileUnexecuted2, FileRun, FileNotRun, FileStarted2, FileNotStarted, FileLaunched2, FileNotLaunched, FileInitiated2, FileNotInitiated, FileBegun, FileNotBegun, FileCommenced2, FileNotCommenced, FileOpened2, FileNotOpened, FileClosed2, FileNotClosed, FileShut, FileNotShut, FileLocked2, FileUnlocked2, FileSealed2, FileUnsealed2, FileSecured3, FileUnsecured3, FileProtected3, FileUnprotected2, FileSafe3, FileUnsafe2, FileGuarded, FileUnguarded, FileDefended, FileUndefended, FileShielded, FileUnshielded, FileCovered2, FileUncovered, FileExposed2, FileUnexposed, FileRevealed2, FileUnrevealed, FileShown2, FileUnshown, FileDisplayed2, FileUndisplayed, FilePresented2, FileUnpresented, FileExhibited2, FileUnexhibited, FileDemonstrated2, FileUndemonstratedIcon
} from 'lucide-react';
import { useAuth, useProjects } from '../hooks/useApi';
import { useTasks } from '../hooks/useTasks';
import TaskBoard from './TaskBoard';

const ClientDashboard = () => {
  const { user, logout } = useAuth();
  const { projects, loading: projectsLoading } = useProjects(user?.id);
  const [selectedProject, setSelectedProject] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSubTab, setActiveSubTab] = useState('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    priority: 'all',
    assignee: 'all'
  });

  const { tasks, loading: tasksLoading, error: tasksError, refreshTasks } = useTasks(selectedProject?.id || '');

  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]);
    }
  }, [projects, selectedProject]);

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'done': return 'bg-green-100 text-green-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'urgent': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'todo': return 'À faire';
      case 'in_progress': return 'En cours';
      case 'review': return 'En révision';
      case 'done': return 'Terminé';
      case 'blocked': return 'Bloqué';
      default: return status;
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case 'low': return 'Faible';
      case 'medium': return 'Moyenne';
      case 'high': return 'Haute';
      case 'urgent': return 'Urgente';
      default: return priority;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filters.status === 'all' || task.status === filters.status;
    const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
    const matchesAssignee = filters.assignee === 'all' || task.assignedTo === filters.assignee;

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
  });

  const taskStats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    review: tasks.filter(t => t.status === 'review').length,
    done: tasks.filter(t => t.status === 'done').length,
    blocked: tasks.filter(t => t.status === 'blocked').length,
    overdue: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'done').length
  };

  const TaskDetailModal = () => {
    if (!selectedTask) return null;

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="bg-gray-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6 border-b border-gray-800 flex justify-between items-center">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-3 ${
                selectedTask.priority === 'urgent' ? 'bg-red-500' :
                selectedTask.priority === 'high' ? 'bg-orange-500' :
                selectedTask.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`}></div>
              <h3 className="text-xl font-bold text-white">{selectedTask.title}</h3>
            </div>
            <button
              onClick={() => {
                setShowTaskModal(false);
                setSelectedTask(null);
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Task Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Statut</label>
                  <div className="mt-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedTask.status)}`}>
                      {getStatusText(selectedTask.status)}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Priorité</label>
                  <div className={`mt-1 font-medium ${getPriorityColor(selectedTask.priority)}`}>
                    {getPriorityText(selectedTask.priority)}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Assigné à</label>
                  <div className="mt-1 flex items-center">
                    {selectedTask.assignedTo ? (
                      <>
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                          {selectedTask.assignedTo.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-white">{selectedTask.assignedTo}</span>
                      </>
                    ) : (
                      <span className="text-gray-400">Non assigné</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Échéance</label>
                  <div className="mt-1 text-white">
                    {selectedTask.dueDate ? new Date(selectedTask.dueDate).toLocaleDateString('fr-FR') : 'Non définie'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Progression</label>
                  <div className="mt-1">
                    <div className="flex items-center">
                      <div className="flex-1 bg-gray-700 rounded-full h-2 mr-3">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${selectedTask.completionPercentage || 0}%` }}
                        />
                      </div>
                      <span className="text-white text-sm font-medium">
                        {selectedTask.completionPercentage || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Temps</label>
                  <div className="mt-1 text-white text-sm">
                    {selectedTask.estimatedHours ? `${selectedTask.estimatedHours}h estimées` : 'Non estimé'}
                    {selectedTask.actualHours && ` / ${selectedTask.actualHours}h réelles`}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-400">Créé le</label>
                  <div className="mt-1 text-white">
                    {new Date(selectedTask.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-400">Mis à jour</label>
                  <div className="mt-1 text-white">
                    {new Date(selectedTask.updatedAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                {selectedTask.tags && selectedTask.tags.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">Tags</label>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {selectedTask.tags.map((tag, index) => (
                        <span key={index} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-900/50 text-blue-400 border border-blue-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {selectedTask.description && (
              <div>
                <label className="text-sm font-medium text-gray-400">Description</label>
                <div className="mt-2 p-4 bg-gray-800 rounded-lg">
                  <p className="text-gray-300 whitespace-pre-wrap">{selectedTask.description}</p>
                </div>
              </div>
            )}

            {/* Checklist */}
            {selectedTask.checklist && selectedTask.checklist.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400">Checklist</label>
                <div className="mt-2 space-y-2">
                  {selectedTask.checklist.map((item, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-800 rounded-lg">
                      <CheckCircle className={`h-5 w-5 mr-3 ${item.completed ? 'text-green-400' : 'text-gray-500'}`} />
                      <span className={`flex-1 ${item.completed ? 'text-gray-400 line-through' : 'text-white'}`}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {selectedTask.comments && selectedTask.comments.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400">Commentaires ({selectedTask.comments.length})</label>
                <div className="mt-2 space-y-3 max-h-64 overflow-y-auto">
                  {selectedTask.comments.map((comment, index) => (
                    <div key={index} className="p-4 bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mr-3">
                            {comment.author.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-medium">{comment.author}</span>
                            <span className={`ml-2 px-2 py-0.5 rounded text-xs ${
                              comment.authorRole === 'client' ? 'bg-blue-900/50 text-blue-400' :
                              comment.authorRole === 'admin' ? 'bg-purple-900/50 text-purple-400' :
                              'bg-green-900/50 text-green-400'
                            }`}>
                              {comment.authorRole === 'client' ? 'Client' :
                               comment.authorRole === 'admin' ? 'Admin' : 'Développeur'}
                            </span>
                          </div>
                        </div>
                        <span className="text-gray-400 text-sm">
                          {new Date(comment.timestamp).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="text-gray-300">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Attachments */}
            {selectedTask.attachments && selectedTask.attachments.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-400">Pièces jointes ({selectedTask.attachments.length})</label>
                <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedTask.attachments.map((attachment, index) => (
                    <div key={index} className="flex items-center p-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors">
                      <FileText className="h-5 w-5 text-blue-400 mr-3" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{attachment.name}</p>
                        <p className="text-gray-400 text-xs">
                          {attachment.uploadedBy} • {new Date(attachment.uploadedAt).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <button className="text-blue-400 hover:text-blue-300 ml-2">
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    );
  };

  const TaskCard = ({ task }) => (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className={`w-3 h-3 rounded-full mr-2 ${
            task.priority === 'urgent' ? 'bg-red-500' :
            task.priority === 'high' ? 'bg-orange-500' :
            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
          }`}></div>
          <h4 className="text-white font-medium text-sm line-clamp-2">{task.title}</h4>
        </div>
        <button
          onClick={() => {
            setSelectedTask(task);
            setShowTaskModal(true);
          }}
          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white transition-all"
        >
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {task.description && (
        <p className="text-gray-400 text-xs mb-3 line-clamp-2">{task.description}</p>
      )}

      <div className="flex items-center justify-between mb-3">
        {task.assignedTo && (
          <div className="flex items-center">
            <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {task.assignedTo.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        {task.dueDate && (
          <div className={`text-xs ${
            new Date(task.dueDate) < new Date() && task.status !== 'done' 
              ? 'text-red-400' 
              : 'text-gray-400'
          }`}>
            {new Date(task.dueDate).toLocaleDateString('fr-FR')}
          </div>
        )}
      </div>

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {task.tags.slice(0, 3).map((tag, index) => (
            <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900/30 text-blue-400">
              {tag}
            </span>
          ))}
          {task.tags.length > 3 && (
            <span className="text-gray-400 text-xs">+{task.tags.length - 3}</span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 text-gray-400">
          {task.comments && task.comments.length > 0 && (
            <div className="flex items-center">
              <MessageCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">{task.comments.length}</span>
            </div>
          )}
          {task.attachments && task.attachments.length > 0 && (
            <div className="flex items-center">
              <Paperclip className="h-4 w-4 mr-1" />
              <span className="text-xs">{task.attachments.length}</span>
            </div>
          )}
        </div>
        {task.completionPercentage > 0 && (
          <div className="text-xs text-gray-400">
            {task.completionPercentage}%
          </div>
        )}
      </div>
    </div>
  );

  const KanbanBoard = () => {
    const columns = [
      { id: 'todo', name: 'À faire', color: 'border-gray-600' },
      { id: 'in_progress', name: 'En cours', color: 'border-blue-600' },
      { id: 'review', name: 'En révision', color: 'border-yellow-600' },
      { id: 'done', name: 'Terminé', color: 'border-green-600' }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnTasks = filteredTasks.filter(task => task.status === column.id);
          
          return (
            <div key={column.id} className={`bg-gray-800 rounded-lg border-t-4 ${column.color}`}>
              <div className="p-4 border-b border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium">{column.name}</h3>
                  <span className="bg-gray-700 text-gray-300 text-xs px-2 py-1 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
              </div>
              <div className="p-4 space-y-3 min-h-[400px]">
                {columnTasks.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
                {columnTasks.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Aucune tâche</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const ListView = () => (
    <div className="bg-gray-800 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Tâche</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Statut</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Priorité</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Assigné à</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Échéance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Progression</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {filteredTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-700/50">
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-white">{task.title}</div>
                    {task.description && (
                      <div className="text-sm text-gray-400 line-clamp-1">{task.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${
                      task.priority === 'urgent' ? 'bg-red-500' :
                      task.priority === 'high' ? 'bg-orange-500' :
                      task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                    }`}></div>
                    <span className={`text-sm ${getPriorityColor(task.priority)}`}>
                      {getPriorityText(task.priority)}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  {task.assignedTo ? (
                    <div className="flex items-center">
                      <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold mr-2">
                        {task.assignedTo.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-gray-300 text-sm">{task.assignedTo}</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">Non assigné</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className={`text-sm ${
                    task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'done' 
                      ? 'text-red-400' 
                      : 'text-gray-300'
                  }`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : 'Non définie'}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center">
                    <div className="w-16 bg-gray-700 rounded-full h-2 mr-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${task.completionPercentage || 0}%` }}
                      />
                    </div>
                    <span className="text-gray-300 text-xs">
                      {task.completionPercentage || 0}%
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        setSelectedTask(task);
                        setShowTaskModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                      title="Voir les détails"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                    <button className="text-green-400 hover:text-green-300" title="Commenter">
                      <MessageCircle className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-800 min-h-screen p-4">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-white mb-2">Espace Client</h2>
            <p className="text-sm text-gray-400">DELIVERY Digital Technology</p>
            {user && (
              <p className="text-xs text-gray-500 mt-2">{user.name}</p>
            )}
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'overview'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <BarChart3 className="h-5 w-5 mr-3" />
              Vue d'ensemble
            </button>

            <button
              onClick={() => setActiveTab('projects')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'projects'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <FolderOpen className="h-5 w-5 mr-3" />
              Mes Projets
            </button>

            <button
              onClick={() => setActiveTab('tasks')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'tasks'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <ClipboardList className="h-5 w-5 mr-3" />
              Mes Tâches
            </button>

            <button
              onClick={() => setActiveTab('messages')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'messages'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <MessageCircle className="h-5 w-5 mr-3" />
              Messages
            </button>

            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'settings'
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-400 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Paramètres
            </button>
          </nav>

          <div className="absolute bottom-4 space-y-2">
            <button
              onClick={() => window.location.href = '/'}
              className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <Home className="h-5 w-5 mr-3" />
              Site principal
            </button>
            <button 
              onClick={handleLogout}
              className="w-full flex items-center px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Déconnexion
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-8">
          {/* Tasks Tab */}
          {activeTab === 'tasks' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Gestion des Tâches</h2>
                <div className="flex items-center space-x-4">
                  {/* Project Selector */}
                  <select
                    value={selectedProject?.id || ''}
                    onChange={(e) => {
                      const project = projects.find(p => p.id === e.target.value);
                      setSelectedProject(project);
                    }}
                    className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm"
                  >
                    <option value="">Tous les projets</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={refreshTasks}
                    className="btn btn-secondary"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Actualiser
                  </button>
                </div>
              </div>

              {/* Task Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{taskStats.total}</div>
                    <div className="text-gray-400 text-sm">Total</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-400">{taskStats.todo}</div>
                    <div className="text-gray-400 text-sm">À faire</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400">{taskStats.in_progress}</div>
                    <div className="text-gray-400 text-sm">En cours</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-400">{taskStats.review}</div>
                    <div className="text-gray-400 text-sm">En révision</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400">{taskStats.done}</div>
                    <div className="text-gray-400 text-sm">Terminé</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-400">{taskStats.blocked}</div>
                    <div className="text-gray-400 text-sm">Bloqué</div>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-500">{taskStats.overdue}</div>
                    <div className="text-gray-400 text-sm">En retard</div>
                  </div>
                </div>
              </div>

              {/* View Toggle and Filters */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setActiveSubTab('kanban')}
                      className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeSubTab === 'kanban'
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Kanban className="h-4 w-4 mr-2" />
                      Kanban
                    </button>
                    <button
                      onClick={() => setActiveSubTab('list')}
                      className={`flex items-center px-4 py-2 rounded-md transition-all ${
                        activeSubTab === 'list'
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <List className="h-4 w-4 mr-2" />
                      Liste
                    </button>
                  </div>
                </div>

                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Rechercher des tâches..."
                      className="w-64 px-4 py-2 pl-10 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 text-sm"
                    />
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  </div>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtres
                  </button>
                </div>
              </div>

              {/* Filters Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-gray-800 rounded-lg p-6 mb-6 overflow-hidden"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Statut</label>
                        <select
                          value={filters.status}
                          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="all">Tous les statuts</option>
                          <option value="todo">À faire</option>
                          <option value="in_progress">En cours</option>
                          <option value="review">En révision</option>
                          <option value="done">Terminé</option>
                          <option value="blocked">Bloqué</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Priorité</label>
                        <select
                          value={filters.priority}
                          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="all">Toutes les priorités</option>
                          <option value="low">Faible</option>
                          <option value="medium">Moyenne</option>
                          <option value="high">Haute</option>
                          <option value="urgent">Urgente</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Assigné à</label>
                        <select
                          value={filters.assignee}
                          onChange={(e) => setFilters({ ...filters, assignee: e.target.value })}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                        >
                          <option value="all">Tous les assignés</option>
                          {[...new Set(tasks.map(t => t.assignedTo).filter(Boolean))].map((assignee) => (
                            <option key={assignee} value={assignee}>{assignee}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Task Content */}
              {tasksLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des tâches...</p>
                </div>
              ) : tasksError ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Erreur de chargement</h3>
                  <p className="text-gray-400 mb-6">{tasksError}</p>
                  <button
                    onClick={refreshTasks}
                    className="btn btn-primary"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                  </button>
                </div>
              ) : !selectedProject ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucun projet sélectionné</h3>
                  <p className="text-gray-400">Sélectionnez un projet pour voir les tâches associées.</p>
                </div>
              ) : filteredTasks.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <ClipboardList className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucune tâche</h3>
                  <p className="text-gray-400">
                    {searchQuery || filters.status !== 'all' || filters.priority !== 'all' || filters.assignee !== 'all'
                      ? 'Aucune tâche ne correspond aux critères de recherche.'
                      : 'Aucune tâche n\'a été créée pour ce projet.'}
                  </p>
                </div>
              ) : (
                <>
                  {activeSubTab === 'kanban' && <KanbanBoard />}
                  {activeSubTab === 'list' && <ListView />}
                </>
              )}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Vue d'ensemble</h2>
                <div className="text-sm text-gray-400">
                  {new Date().toLocaleDateString('fr-FR')}
                </div>
              </div>

              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Projets actifs</p>
                      <p className="text-2xl font-bold text-white">
                        {projects.filter(p => p.status === 'in_progress').length}
                      </p>
                    </div>
                    <FolderOpen className="h-8 w-8 text-blue-400" />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Tâches en cours</p>
                      <p className="text-2xl font-bold text-white">{taskStats.in_progress}</p>
                    </div>
                    <ClipboardList className="h-8 w-8 text-purple-400" />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Messages non lus</p>
                      <p className="text-2xl font-bold text-white">0</p>
                    </div>
                    <MessageCircle className="h-8 w-8 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Projets récents</h3>
                  <div className="space-y-4">
                    {projects.slice(0, 5).map((project) => (
                      <div key={project.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
                        <FolderOpen className="h-5 w-5 text-blue-400 mr-3" />
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{project.title}</p>
                          <p className="text-gray-400 text-xs">
                            {getStatusText(project.status)} • {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">Tâches prioritaires</h3>
                  <div className="space-y-4">
                    {tasks
                      .filter(t => t.priority === 'urgent' || t.priority === 'high')
                      .slice(0, 5)
                      .map((task) => (
                        <div key={task.id} className="flex items-center p-3 bg-gray-700 rounded-lg">
                          <div className={`w-3 h-3 rounded-full mr-3 ${
                            task.priority === 'urgent' ? 'bg-red-500' : 'bg-orange-500'
                          }`}></div>
                          <div className="flex-1">
                            <p className="text-white text-sm font-medium">{task.title}</p>
                            <p className="text-gray-400 text-xs">
                              {getStatusText(task.status)} • {getPriorityText(task.priority)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Mes Projets</h2>
              </div>

              {projectsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-4 text-gray-400">Chargement des projets...</p>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-lg">
                  <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-white mb-2">Aucun projet</h3>
                  <p className="text-gray-400">Vous n'avez pas encore de projet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <div key={project.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-lg font-bold text-white">{project.title}</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                          {getStatusText(project.status)}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{project.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="text-gray-400 text-sm">
                          {new Date(project.lastUpdate).toLocaleDateString('fr-FR')}
                        </div>
                        <button
                          onClick={() => {
                            setSelectedProject(project);
                            setActiveTab('tasks');
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                        >
                          Voir les tâches
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Messages Tab */}
          {activeTab === 'messages' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Messages</h2>
              </div>
              <div className="text-center py-12 bg-gray-800 rounded-lg">
                <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Messages</h3>
                <p className="text-gray-400">Fonctionnalité de messagerie à venir.</p>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-white">Paramètres</h2>
              </div>
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Informations du compte</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-400">Nom</label>
                    <div className="mt-1 text-white">{user?.name}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Email</label>
                    <div className="mt-1 text-white">{user?.email}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Entreprise</label>
                    <div className="mt-1 text-white">{user?.company || 'Non renseigné'}</div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">Rôle</label>
                    <div className="mt-1 text-white capitalize">{user?.role}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Task Detail Modal */}
      <AnimatePresence>
        {showTaskModal && selectedTask && <TaskDetailModal />}
      </AnimatePresence>
    </div>
  );
};

export default ClientDashboard;