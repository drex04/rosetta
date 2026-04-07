# Phase 13: Onboarding Demo — Example Data Research

**Researched:** 2026-04-07
**Domain:** NATO air defense data formats, ontologies, and realistic synthetic track data
**Confidence:** MEDIUM (most field-level specs from open documentation; classified details not available)

---

## Summary

This research documents the real field names, data types, and structures used in NATO air surveillance standards relevant to the Rosetta demo project. The primary sources are EUROCONTROL's public ASTERIX CAT-048 specification (the most accessible NATO radar format), Link 16 J-series message descriptions from open simulation standards (SISO-STD-002-2021), the C2SIM OWL ontology already in the repo (`src/data/C2SIM.rdf`), and NATO military symbology conventions.

The core conclusion: **ASTERIX CAT-048 is the best source for realistic radar field names** because it is publicly documented in full by EUROCONTROL. Link 16 J3.2 field names are partially available through simulation standards and flight-sim documentation. C2SIM.rdf already contains a solid base of OWL properties (altitude, speed, heading, latitude, longitude, time-of-observation) that the master ontology can align to.

**Primary recommendation:** Model the demo data on ASTERIX CAT-048 field names for the sensor source, Link 16 J3.2 naming for the C2/tactical layer, and C2SIM ontology properties for the master ontology target.

---

## 1. NATO Air Track / Surveillance Data Formats

### 1.1 Link 16 / STANAG 5516 — J-Series Air Track Messages

**Access status:** STANAG 5516 / MIL-STD-6016 is Distribution Restriction C (classified). Full field specs are not publicly available. However, open simulation standards (SISO-STD-002-2021) and declassified training materials document the message structure at a usable level.

**Relevant message types:**
| Message | Name | Purpose |
|---------|------|---------|
| J2.2 | Air PPLI (Precise Participant Location & Identification) | Own-force air position reports |
| J3.0 | Reference Point | Reference/waypoint data |
| J3.2 | Air Track | Primary surveillance air track (non-participant) |
| J3.5 | Surface Track | Surface contact |
| J7.0 | Track Management | Track quality / life management |

**J3.2 Air Track — known fields (MEDIUM confidence, from SISO-STD-002-2021 and training docs):**
| Field Name | Type | Description |
|-----------|------|-------------|
| `TrackNumber` | 5-digit octal (00001–77776) | Unique network track number (J-series track numbering) |
| `Latitude` | degrees, 0.0006° LSB | WGS-84 latitude |
| `Longitude` | degrees, 0.0006° LSB | WGS-84 longitude |
| `Altitude` | feet, 100 ft LSB | Barometric altitude (FL × 100) |
| `Course` | degrees true, 0–359 | Ground track direction |
| `Speed` | knots | Horizontal ground speed |
| `Identity` | enum | IFF/SIF identity code (see Section 2) |
| `PlatformType` | enum | Air platform type (fighter, bomber, rotary, etc.) |
| `Activity` | enum | Activity code (unknown, surveillance, air intercept…) |
| `Strength/Confidence` | enum | Track quality (e.g., 1–15 scale) |
| `TimeOfApplicability` | seconds from midnight UTC | Time the position data is valid |
| `DataTerminalDesignator` | alphanumeric | Source DL-JTIDS/MIDS terminal ID |

**Note on J3.2 track numbers:** Link 16 uses a 5-digit octal number in the range 00001–77776 (decimal 1–32766). Tracks from different platforms are prefixed with a Nation/Unit identifier in the 5-digit field. Common convention is `NNxxx` where NN is nation code.

### 1.2 ASTERIX CAT-048 — Monoradar Target Reports

**Access status:** Fully public. Maintained by EUROCONTROL. Current edition: 1.31 (as of late 2024).
**Source:** https://zoranbosnjak.github.io/asterix-specs/specs/cat048/cats/cat1.27/definition.html and https://www.eurocontrol.int/publication/cat048-eurocontrol-specification-surveillance-data-exchange-asterix-part4

ASTERIX (All Purpose Structured Eurocontrol Surveillance Information Exchange) is used across NATO nations for radar data distribution. CAT-048 covers monoradar target reports — each record is a detected/tracked aircraft from one sensor.

**Complete data item list (CAT-048 ed. 1.27/1.31):**

| Item ID | Name | Size | Format | Description |
|---------|------|------|--------|-------------|
| `I048/010` | Data Source Identifier | 2 bytes | SAC (8 bit) + SIC (8 bit) | Radar station ID. SAC = System Area Code (national), SIC = System Identification Code (sensor within area) |
| `I048/020` | Target Report Descriptor | 1+ bytes | Extendable bitfield | TYP: {PSR, SSR, SSR+PSR, ModeS-AllCall, ModeS-Rollcall}; SIM flag; RDPC (chain); SPI (special position); RAB (reflector) |
| `I048/030` | Warning/Error Conditions | 1+ bytes | Extendable | System-level alert flags |
| `I048/040` | Measured Position (Polar) | 4 bytes | RHO (16 bit, 1/256 NM LSB) + THETA (16 bit, 360°/65536 LSB) | Slant range and azimuth from sensor |
| `I048/042` | Calculated Position (Cartesian) | 4 bytes | X (16 bit, 1/128 NM) + Y (16 bit, 1/128 NM) | Local Cartesian co-ords relative to radar |
| `I048/050` | Mode-2 Code | 2 bytes | V + G + L + mode2 (12 bit octal) | IFF Mode 2 transponder code |
| `I048/055` | Mode-1 Code | 1 byte | V + G + L + mode1 (5 bit) | IFF Mode 1 code |
| `I048/060` | Mode-2 Confidence Indicator | 2 bytes | Bit per digit of Mode-2 | Confidence for each digit |
| `I048/065` | Mode-1 Confidence Indicator | 1 byte | Bit per digit of Mode-1 | — |
| `I048/070` | Mode-3/A Code | 2 bytes | V + G + L + mode3A (12 bit octal) | SSR Mode 3/A squawk code (0000–7777 octal) |
| `I048/080` | Mode-3/A Confidence Indicator | 2 bytes | Bitfield | Garble/validation flags per digit |
| `I048/090` | Flight Level | 2 bytes | V + G + FL (14 bit, 1/4 FL LSB) | Barometric altitude in FL × 25 ft |
| `I048/100` | Mode-C Code & Confidence | 4 bytes | V + G + MODEC (12 bit) + confidence | Pressure altitude |
| `I048/110` | Height Measured by 3D Radar | 2 bytes | 14 bit signed, 25 ft LSB | 3D height if radar capable |
| `I048/120` | Radial Doppler Speed | variable | CAL + DOP sub-items | Radial velocity from Doppler measurement |
| `I048/130` | Radar Plot Characteristics | variable | Sub-items: SRL, SRR, SAM, PRL, PAM, RPD, APD | Signal levels, azimuth/range plot dispersions |
| `I048/140` | Time of Day | 3 bytes | UTC seconds × 128 | Sensor-local time of detection (1/128 second precision) |
| `I048/161` | Track Number | 2 bytes | 12 bit unsigned (0–4095) | Local sensor track number |
| `I048/170` | Track Status | 1+ bytes | CNF + RAD + DOU + MAH + CDM + TRE + GHO + SUP + TCC | CNF=confirmed, RAD=psr/ssr/combo, DOU=doubtful, MAH=manoeuvre, CDM=climb/descend/level, TRE=end-of-track, GHO=ghost |
| `I048/200` | Calculated Track Velocity | 4 bytes | GSP (16 bit, knots/2^14 LSB) + HDG (16 bit, 360°/65536 LSB) | Groundspeed (knots) + heading (degrees) |
| `I048/210` | Track Quality | 4 bytes | SIGX + SIGY + SIGV + SIGH | Standard deviations: position X, Y; speed; heading |
| `I048/220` | Aircraft Address | 3 bytes | 24-bit ICAO address | Mode S ICAO 24-bit aircraft address |
| `I048/230` | Communications/ACAS Capability | 2 bytes | COM + STAT + SI + MSSC + ARC + AIC + B1A + B1B | Transponder capability flags |
| `I048/240` | Aircraft Identification | 6 bytes | 8 char Callsign (6-bit encoding) | ICAO callsign from Mode S BDS 2,0 |
| `I048/250` | Mode S MB Data | variable | BDS register + 56-bit data | Arbitrary BDS data (speed, intent, etc.) |
| `I048/260` | ACAS Resolution Advisory | 7 bytes | RA content | TCAS/ACAS advisory data |
| `I048/SP` | Special Purpose Field | variable | Site-specific | National extension |
| `I048/RE` | Reserved Expansion Field | variable | Includes Mode 5 military data | NATO Mode 5 IFF (encrypted, mil-only) |

**Key data type notes:**
- SAC/SIC pair uniquely identifies a radar: e.g., SAC=`0x47` (Norway), SIC=`0x02` (specific radar site)
- Mode 3/A squawk: 4-digit octal (0000–7777), used for ATC and basic IFF
- Mode 5: NATO encrypted IFF — only present in `I048/RE`, not directly readable in civil systems
- Time of Day: expressed as UTC seconds past midnight × 128, e.g., `0x5A0000` = 45056/128 = 352.0 s = 00:05:52 UTC
- Flight Level: I048/090 value × 25 = altitude in feet. E.g., value 140 → FL035 (3500 ft)
- Track Number (I048/161): sensor-local, 12-bit (0–4095). NOT globally unique — combine with SAC/SIC for global ID.

### 1.3 C2SIM Ontology — Properties in `src/data/C2SIM.rdf`

The repo's C2SIM.rdf (namespace: `http://www.sisostds.org/ontologies/C2SIM#`) contains these relevant OWL properties for air tracks:

**Datatypes defined:**
| RDF Name | XSD Type | Description |
|----------|----------|-------------|
| `C2SIM#latitude` | xsd:decimal, -90 to +90 | WGS-84 latitude |
| `C2SIM#longitude` | xsd:decimal, -180 to +180 | WGS-84 longitude |
| `C2SIM#IsoDateTimeBase` | xsd:string (ISO 8601) | DateTime string, e.g., `2024-03-15T14:32:00Z` |
| `C2SIM#IsoTimeDurationBase` | xsd:string (ISO 8601 duration) | Duration, e.g., `PT5M` |

**Object Properties (hasX → class):**
| Property | Domain | Range | Notes |
|----------|--------|-------|-------|
| `hasLocation` | Entity | Location | Geospatial location object |
| `hasDateTime` | — | TimeInstant | ISO DateTime value |
| `hasTimeOfObservation` | ReportContent | TimeInstant | When observation was made |
| `hasEntityState` | Entity | EntityState | Current state of entity |
| `hasEntityHealthStatus` | Entity | HealthStatus | Operational health |
| `hasOperationalStatusCode` | Entity | OperationalStatus | Ready/degraded/non-operational |
| `hasNamedEntityType` | Entity | NamedEntityType | Platform type name |
| `hasSISOEntityType` | Entity | SISOEntityType | IEEE 1516 DIS entity type |
| `hasAllegiance` | Entity | Allegiance | friendly/hostile/neutral/unknown |
| `hasHeadingDirection` | Entity | Direction | Geospatial direction of movement |
| `hasOrientation` | Entity | Orientation | Full 3D orientation |
| `hasReportContent` | Message | ReportContent | Content of a report message |
| `hasReportingEntity` | Report | Entity | Entity making the report |
| `hasStartTime` | Action | TimeInstant | Start of action/observation |
| `hasEndTime` | Action | TimeInstant | End of action |

**Datatype Properties (hasX → literal):**
| Property | XSD Range | Notes |
|----------|-----------|-------|
| `hasAltitude` | xsd:decimal | Abstract; use AGL or MSL subproperties |
| `hasAltitudeAGL` | xsd:decimal (meters) | Above Ground Level |
| `hasAltitudeMSL` | xsd:decimal (meters) | Above Mean Sea Level |
| `hasHeadingAngle` | xsd:decimal (degrees) | Clockwise from grid north, 0–360 |
| `hasSpeed` | xsd:decimal (m/s) | Horizontal ground speed |
| `hasEntityReference` | xsd:string | Reference to entity UUID |
| `hasEntityTypeName` | xsd:string | Human-readable type name |
| `hasReportID` | xsd:string | Unique report identifier |
| `hasLabel` | xsd:string | Human-readable label |
| `hasConcreteEntityReference` | xsd:string | Concrete entity UUID |

**C2SIM allegiance values (from rdfs:comment line 271):**
`friendly`, `hostile`, `neutral`, `unknown` — matches NATO standard.

### 1.4 STANAG 4676 — ISR Tracking Standard

**Access status:** Restricted. Available at government/NATO portals only.

From open IEEE paper (IET 2008) and descriptions:
- STANAG 4676 (NITS — NATO ISR Tracking Standard) defines track content and format for sensor-fusion outputs
- Fields include: track ID, sensor ID, position (lat/lon/alt), velocity vector (speed + heading), track status, identification (IFF-derived), confidence level, track type (air/surface/subsurface)
- Implementors: AGDS (Allied Ground Surveillance), NATO AGS (Global Hawk-based)
- Companion: AEDP-12.1 (Implementation Guide)
- XML schema exists but is distribution-restricted

**Confidence:** LOW (no public field-level spec found)

---

## 2. NATO IFF / Track Identity Codes

### Standard Identity Classifications (APP-6D / STANAG 5527 / Link 16)

Used in NATO Joint Military Symbology, Link 16, and all NATO C2 systems:

| Code | Full Name | Abbrev | Symbol Color | Frame Shape |
|------|-----------|--------|--------------|-------------|
| `FRIEND` | Friend | F | Blue | Rectangle |
| `ASSUMED-FRIEND` | Assumed Friend | AF | Blue | Rectangle (dashed) |
| `NEUTRAL` | Neutral | N | Green | Square |
| `UNKNOWN` | Unknown | UNK | Yellow | Quatrefoil |
| `SUSPECT` | Suspect | S | Red | Diamond (dashed) |
| `HOSTILE` | Hostile | H | Red | Diamond |
| `PENDING` | Pending | P | Yellow | Quatrefoil |
| `JOKER` | Joker (exercise only) | J | — | Exercise prefix |
| `FAKER` | Faker (exercise only) | FK | — | Exercise prefix |

**Link 16 identity encoding (J3.2 track identity field):**
The identity word carries:
1. **Environment**: Air / Surface / Subsurface / Land
2. **Identity**: Pending / Unknown / Assumed Friend / Friend / Neutral / Suspect / Hostile
3. **Platform Type**: Fighter / Bomber / Cargo / Rotary / RECCE / Electronic / Tanker / Drone / etc.

**IFF Mode progression in NATO:**
- Mode 1: 2-digit mission code (unencrypted, legacy)
- Mode 2: 4-digit unit code (unencrypted, legacy)
- Mode 3/A: 4-digit squawk (shared with civil ATC, 0000–7777 octal)
- Mode 4: NATO encrypted friend/foe (cold war standard, being retired)
- Mode 5: NATO encrypted, Level 1 (friendly/unknown) and Level 2 (full ID), cryptographically secure — current NATO standard
- Mode S: ICAO 24-bit address + datalink (civil + mil, used in ASTERIX)

**Squawk codes of operational interest:**
| Code (octal) | Meaning |
|-------------|---------|
| 7700 | Emergency |
| 7600 | Radio failure |
| 7500 | Hijack |
| 7777 | Military intercept operations |
| 0000 | Default / no code assigned |

---

## 3. Real-World NATO Sensor / Radar Names

### Norwegian Air Defense (NASAMS)

| System | Role | Sensor Type | Notes |
|--------|------|-------------|-------|
| **NASAMS** (Norwegian Advanced Surface-to-Air Missile System) | SHORAD/MRAD | SAM system | Joint Kongsberg/Raytheon. Uses AIM-120 AMRAAM. Each firing unit = 1× MPQ-64F1 radar + 3× LCHR launchers + FDC |
| **AN/MPQ-64F1 Improved Sentinel** | Search + Track radar | X-band 3D pulse-Doppler | 120 km range; tracks 60+ targets simultaneously; 360° coverage; outputs 3D track data (azimuth, elevation, range) |
| **AN/TPS-77** | Long-range air search | L-band 2D/3D | Mobile long-range (450+ km) surveillance; used as gap-filler/cueing radar |
| **TADKOM** | Data link / C2 | Communication | Norwegian C2 network linking NASAMS units and radars |

**Typical sensor ID format in Norwegian NASAMS network:**
`SAC=0x4E` (Norway national code), `SIC=0x01..0x0F` (sensor number within area)

### German Air Defense

| System | Role | Sensor Type | Notes |
|--------|------|-------------|-------|
| **PATRIOT PAC-3** | THAAD-tier SAM | SAM system | AN/MPQ-65 radar (phased array, X-band). German Luftwaffe designation: FlaRakSys Patriot |
| **AN/MPQ-65** | Fire control radar | X-band phased array | Organic to PATRIOT battery; range ~150 km; tracks 100+ targets |
| **COBRA** (Counter-Battery Radar) | Artillery location | X-band phased array | Trinational (DE/FR/UK). Detects mortar/artillery rounds in flight — not primary air surveillance but feeds fused COP |
| **FüWES** | C2 system | Software | German Air Defense C2 — Führungs- und Waffeneinsatzsystem |

### UK Air Defense

| System | Role | Sensor Type | Notes |
|--------|------|-------------|-------|
| **Saab Giraffe AMB** | Short-range 3D | C-band AESA | 3D surveillance + track; 75 km range; used by UK as GBAD sensor feeding SHORAD |
| **Raytheon Sentinel R1** | Airborne surveillance | ASTOR (radar aircraft) | Airborne ground/surface surveillance — not air track source but ISR feeder |
| **JTIDS/MIDS terminal** | Link 16 node | Data link | All UK platforms equipped for Link 16 track exchange |

**Giraffe AMB sensor characteristics relevant to data:**
- Generates 3D tracks: azimuth, elevation, range → lat/lon/alt computed
- Outputs via Link 16 (J3.2) and NFFI (NATO Friendly Force Identification XML)
- Saab internal: `C-band`, update rate 1 rpm (~1 s), track capacity: hundreds

---

## 4. Synthesized Master Ontology Properties for AirTrack

Based on the above standards, here is a recommended set of properties for a NATO AirTrack master ontology class, with field names, types, and the source standard(s) each maps to:

### Class: `nato:AirTrack`

| Property | XSD Type | Unit | Source Standard | Notes |
|----------|----------|------|-----------------|-------|
| `hasTrackNumber` | xsd:string | — | Link 16 J3.2, ASTERIX I048/161 | Link 16: 5-digit octal (e.g., "03456"); ASTERIX: 12-bit integer. Use string for cross-format compatibility |
| `hasLatitude` | xsd:decimal | degrees (WGS-84) | All | -90 to +90 |
| `hasLongitude` | xsd:decimal | degrees (WGS-84) | All | -180 to +180 |
| `hasAltitudeMSL` | xsd:decimal | meters | ASTERIX I048/090, C2SIM | Barometric altitude above MSL |
| `hasGroundSpeed` | xsd:decimal | knots | ASTERIX I048/200, Link 16 J3.2 | Horizontal speed over ground |
| `hasHeadingAngle` | xsd:decimal | degrees (true) | ASTERIX I048/200, Link 16 J3.2, C2SIM | 0–360, clockwise from true north |
| `hasIdentity` | xsd:string (enum) | — | Link 16 J3.2, APP-6D | FRIEND / ASSUMED-FRIEND / NEUTRAL / UNKNOWN / SUSPECT / HOSTILE / PENDING |
| `hasSensorID` | xsd:string | — | ASTERIX I048/010 | Composed as "SAC-SIC" e.g., "0x47-0x02", or ICAO sensor designator |
| `hasTimestamp` | xsd:dateTime | UTC | ASTERIX I048/140, C2SIM | ISO 8601 datetime |
| `hasCountryOfOrigin` | xsd:string | — | Derived / intelligence | ISO 3166-1 alpha-2 or NATO nation code |
| `hasTrackQuality` | xsd:integer | 0–15 | ASTERIX I048/210, Link 16 J7.0 | Confidence/quality score; 15=highest |
| `hasMode3ACode` | xsd:string | octal 0000–7777 | ASTERIX I048/070 | SSR transponder squawk |
| `hasCallsign` | xsd:string | — | ASTERIX I048/240 | ICAO Mode S callsign (up to 8 chars) |
| `hasICAOAddress` | xsd:string | hex 000000–FFFFFF | ASTERIX I048/220 | Mode S 24-bit ICAO aircraft address |
| `hasPlatformType` | xsd:string (enum) | — | Link 16 J3.2 | FIGHTER / BOMBER / ROTARY / TRANSPORT / UAV / UNKNOWN |
| `hasVerticalRate` | xsd:decimal | ft/min | ASTERIX I048/170 CDM bits | Derived: CLIMB / LEVEL / DESCEND |
| `hasDataSource` | xsd:string | — | All | Human-readable sensor name e.g., "MPQ-64F1-NO-01" |

---

## 5. Sample XML Message Format

### 5.1 ASTERIX CAT-048 does NOT have a native XML format

ASTERIX is a binary protocol. There is no official NATO "ASTERIX XML" — it is a packed binary format transmitted over UDP multicast on military/ATC networks. However, XML wrappers exist in:
- NATO NFFI (Friendly Force Identification) — XML-based, uses similar fields
- C2SIM XML messages — higher-level C2 layer

### 5.2 Realistic Synthetic NATO Sensor XML

The following is a realistic synthetic XML message styled after NATO sensor/C2 conventions (blending ASTERIX field semantics with C2SIM-style XML structure). This is what a sensor gateway converting binary ASTERIX → XML would produce:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- NATO Air Surveillance Track Report -->
<!-- Source: MPQ-64F1 Improved Sentinel Radar, Norwegian NASAMS Battery 1 -->
<!-- SAC: 0x4E (Norway) | SIC: 0x03 (NASAMS BTY-1 Ørland) -->
<!-- Generated: 2024-03-15T14:32:07.125Z -->
<AirSurveillanceReport xmlns="urn:nato:stanag:airtrack:1.0"
                       xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <MessageHeader>
    <MessageID>NO-NAS-B1-20240315-00847</MessageID>
    <SendingTime>2024-03-15T14:32:07.125Z</SendingTime>
    <SensorIdentifier>
      <SAC>0x4E</SAC>
      <SIC>0x03</SIC>
      <SensorName>MPQ-64F1-NO-ORLAND-01</SensorName>
      <SensorType>RADAR_3D_PULSE_DOPPLER</SensorType>
      <SensorLocation>
        <Latitude>63.6988</Latitude>
        <Longitude>9.6049</Longitude>
        <AltitudeMSL>28.0</AltitudeMSL>
      </SensorLocation>
    </SensorIdentifier>
  </MessageHeader>

  <TrackReport>
    <!-- I048/161: Local track number (sensor-assigned) -->
    <TrackNumber>0842</TrackNumber>
    <!-- Globally unique: SAC-SIC-TrackNumber -->
    <GlobalTrackID>4E-03-0842</GlobalTrackID>

    <!-- I048/140: Time of detection -->
    <TimeOfDetection>2024-03-15T14:32:07.000Z</TimeOfDetection>

    <!-- I048/040: Measured position (polar, sensor-relative) -->
    <MeasuredPositionPolar>
      <Rho_NM>47.3</Rho_NM>
      <Theta_deg>312.7</Theta_deg>
    </MeasuredPositionPolar>

    <!-- Computed geodetic position -->
    <Position>
      <Latitude>65.1247</Latitude>
      <Longitude>7.8833</Longitude>
    </Position>

    <!-- I048/090: Flight level / barometric altitude -->
    <FlightLevel>245</FlightLevel>
    <!-- I048/110 (if 3D radar): Height above MSL in feet -->
    <AltitudeMSL_ft>24500</AltitudeMSL_ft>

    <!-- I048/200: Calculated track velocity -->
    <TrackVelocity>
      <GroundSpeed_kts>420</GroundSpeed_kts>
      <Heading_deg>185.3</Heading_deg>
    </TrackVelocity>

    <!-- I048/170: Track status -->
    <TrackStatus>
      <Confirmed>true</Confirmed>
      <DetectionType>SSR_PSR</DetectionType>
      <VerticalMovement>LEVEL</VerticalMovement>
      <Manoeuvring>false</Manoeuvring>
      <GhostTrack>false</GhostTrack>
    </TrackStatus>

    <!-- I048/070: SSR Mode 3/A code -->
    <Mode3A>
      <Code>3754</Code>
      <Valid>true</Valid>
      <Garbled>false</Garbled>
    </Mode3A>

    <!-- I048/220: Mode S ICAO 24-bit address -->
    <ICAOAddress>4B9F2A</ICAOAddress>

    <!-- I048/240: Mode S callsign -->
    <Callsign>NAF587</Callsign>

    <!-- I048/210: Track quality (position standard deviations) -->
    <TrackQuality>
      <SigmaX_NM>0.04</SigmaX_NM>
      <SigmaY_NM>0.04</SigmaY_NM>
      <SigmaSpeed_kts>2.1</SigmaSpeed_kts>
      <SigmaHeading_deg>0.8</SigmaHeading_deg>
      <!-- Composite quality score 0–15, 15=best -->
      <QualityScore>12</QualityScore>
    </TrackQuality>

    <!-- NATO IFF / Identity -->
    <Identity>
      <IFFMode>MODE_5</IFFMode>
      <TrackIdentity>ASSUMED-FRIEND</TrackIdentity>
      <NationCode>NOR</NationCode>
    </Identity>

    <!-- Platform characterization -->
    <PlatformType>FIGHTER</PlatformType>
    <Activity>AIR_INTERCEPT</Activity>

  </TrackReport>
</AirSurveillanceReport>
```

### 5.3 Second Example — Hostile Unknown Track (German PATRIOT Battery)

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!-- NATO Air Surveillance Track Report -->
<!-- Source: AN/MPQ-65 PATRIOT Fire Control Radar, GE PATRIOT BTY-3 Ramstein -->
<!-- SAC: 0x26 (Germany) | SIC: 0x07 (PATRIOT BTY-3) -->
<AirSurveillanceReport xmlns="urn:nato:stanag:airtrack:1.0">
  <MessageHeader>
    <MessageID>DE-PAT-B3-20240315-01122</MessageID>
    <SendingTime>2024-03-15T14:33:51.500Z</SendingTime>
    <SensorIdentifier>
      <SAC>0x26</SAC>
      <SIC>0x07</SIC>
      <SensorName>MPQ-65-DE-RAMSTEIN-03</SensorName>
      <SensorType>RADAR_PHASED_ARRAY_FIRE_CONTROL</SensorType>
      <SensorLocation>
        <Latitude>49.4369</Latitude>
        <Longitude>7.6003</Longitude>
        <AltitudeMSL>203.0</AltitudeMSL>
      </SensorLocation>
    </SensorIdentifier>
  </MessageHeader>

  <TrackReport>
    <TrackNumber>1247</TrackNumber>
    <GlobalTrackID>26-07-1247</GlobalTrackID>
    <TimeOfDetection>2024-03-15T14:33:51.000Z</TimeOfDetection>

    <MeasuredPositionPolar>
      <Rho_NM>68.1</Rho_NM>
      <Theta_deg>047.2</Theta_deg>
    </MeasuredPositionPolar>

    <Position>
      <Latitude>50.7918</Latitude>
      <Longitude>10.2247</Longitude>
    </Position>

    <FlightLevel>310</FlightLevel>
    <AltitudeMSL_ft>31000</AltitudeMSL_ft>

    <TrackVelocity>
      <GroundSpeed_kts>680</GroundSpeed_kts>
      <Heading_deg>247.0</Heading_deg>
    </TrackVelocity>

    <TrackStatus>
      <Confirmed>true</Confirmed>
      <DetectionType>PSR_ONLY</DetectionType>
      <VerticalMovement>DESCENDING</VerticalMovement>
      <Manoeuvring>true</Manoeuvring>
      <GhostTrack>false</GhostTrack>
    </TrackStatus>

    <!-- No SSR response — PSR-only detection -->
    <Mode3A>
      <Code>0000</Code>
      <Valid>false</Valid>
    </Mode3A>

    <ICAOAddress>000000</ICAOAddress>
    <Callsign/>

    <TrackQuality>
      <SigmaX_NM>0.12</SigmaX_NM>
      <SigmaY_NM>0.12</SigmaY_NM>
      <SigmaSpeed_kts>8.5</SigmaSpeed_kts>
      <SigmaHeading_deg>3.2</SigmaHeading_deg>
      <QualityScore>6</QualityScore>
    </TrackQuality>

    <Identity>
      <IFFMode>NONE</IFFMode>
      <TrackIdentity>HOSTILE</TrackIdentity>
      <NationCode>UNKNOWN</NationCode>
    </Identity>

    <PlatformType>UNKNOWN</PlatformType>
    <Activity>UNKNOWN</Activity>
  </TrackReport>
</AirSurveillanceReport>
```

---

## 6. Field Name Mapping Table

Cross-reference of field names across the three source formats and the proposed master ontology:

| Master Ontology Property | ASTERIX CAT-048 | Link 16 J3.2 | C2SIM OWL |
|--------------------------|-----------------|--------------|-----------|
| `hasTrackNumber` | `I048/161` TrackNumber | TrackNumber (5-digit octal) | `hasEntityReference` |
| `hasLatitude` | Computed from I048/040 | Latitude | `C2SIM#latitude` |
| `hasLongitude` | Computed from I048/040 | Longitude | `C2SIM#longitude` |
| `hasAltitudeMSL` | `I048/090` FlightLevel × 100ft | Altitude (100 ft LSB) | `C2SIM#hasAltitudeMSL` |
| `hasGroundSpeed` | `I048/200` GSP (knots) | Speed (knots) | `C2SIM#hasSpeed` (m/s) |
| `hasHeadingAngle` | `I048/200` HDG (degrees) | Course (degrees) | `C2SIM#hasHeadingAngle` |
| `hasIdentity` | `I048/070` Mode3A + RE/Mode5 | Identity (enum 7 values) | `C2SIM#hasAllegiance` |
| `hasSensorID` | `I048/010` SAC + SIC | DataTerminalDesignator | `C2SIM#hasReportingEntity` |
| `hasTimestamp` | `I048/140` TimeOfDay | TimeOfApplicability | `C2SIM#hasTimeOfObservation` |
| `hasMode3ACode` | `I048/070` Mode3A octal | (embedded in J3.2) | — |
| `hasCallsign` | `I048/240` AircraftID | — | `C2SIM#hasLabel` |
| `hasICAOAddress` | `I048/220` AircraftAddress | — | — |
| `hasTrackQuality` | `I048/210` SigmaX/Y/V/H | Track quality 1–15 | — |
| `hasPlatformType` | `I048/020` TYP field | PlatformType enum | `C2SIM#hasEntityTypeName` |
| `hasCountryOfOrigin` | (from SAC/Mode5 Level 2) | NationCode | — |
| `hasDataSource` | SAC+SIC label | DT Designator | `C2SIM#hasReportingEntity` |

**Unit conversion notes for mapping:**
- C2SIM `hasSpeed` is m/s; ASTERIX I048/200 is knots; Link 16 is knots → multiply by 0.514444 for C2SIM
- C2SIM `hasAltitudeMSL` is meters; ASTERIX I048/090 is FL (FL × 30.48 = meters); Link 16 is feet (× 0.3048)
- C2SIM `hasHeadingAngle` is degrees, same units as ASTERIX and Link 16
- ASTERIX TrackNumber is local (12-bit 0–4095); Link 16 is network-global (5-digit octal). Compose a global ID: `{SAC}-{SIC}-{TrackNumber}`

---

## 7. Confidence Assessment

| Area | Confidence | Reason |
|------|-----------|--------|
| ASTERIX CAT-048 fields | HIGH | Full public spec from EUROCONTROL; zoranbosnjak spec browser confirms all item IDs and bit widths |
| C2SIM OWL properties | HIGH | Direct inspection of `src/data/C2SIM.rdf` in repo |
| Link 16 J3.2 field names | MEDIUM | SISO-STD-002-2021 + flight sim documentation; actual MIL-STD-6016 is classified |
| NATO IFF codes | HIGH | APP-6D symbology standard is public; Link 16 identity enumeration confirmed from multiple open sources |
| Real sensor names/types | HIGH | Wikipedia + manufacturer specs (Kongsberg, Saab, Raytheon) publicly available |
| STANAG 4676 field details | LOW | Spec is restricted; only high-level descriptions available publicly |
| Sample XML format | MEDIUM | Synthesized from known fields; not an official NATO XML schema |

---

## Sources

### Primary (HIGH confidence)
- EUROCONTROL ASTERIX CAT-048 specification: https://www.eurocontrol.int/publication/cat048-eurocontrol-specification-surveillance-data-exchange-asterix-part4
- ASTERIX CAT-048 ed. 1.27 interactive spec: https://zoranbosnjak.github.io/asterix-specs/specs/cat048/cats/cat1.27/definition.html
- C2SIM OWL ontology: `src/data/C2SIM.rdf` (direct inspection, namespace `http://www.sisostds.org/ontologies/C2SIM#`)
- AN/MPQ-64 Sentinel: https://en.wikipedia.org/wiki/AN/MPQ-64_Sentinel
- NASAMS: https://en.wikipedia.org/wiki/NASAMS
- Kongsberg MPQ-64F1 data sheet: https://www.kongsberg.com/kda/what-we-do/defence-and-security/integrated-air-and-missile-defence/nasams-air-defence-system/raytheon-mpq64f1-sentinel-radar/
- Giraffe AMB: https://www.saab.com/products/giraffe-amb
- NATO Joint Military Symbology (APP-6D): https://en.wikipedia.org/wiki/NATO_Joint_Military_Symbology

### Secondary (MEDIUM confidence)
- SISO-STD-002-2021 Link 16 Simulation Standard (open, non-classified): https://cdn.ymaws.com/www.sisostandards.org/resource/resmgr/standards_products/siso-std-002-2021_link_16.pdf
- Falcon BMS Link 16 forum (verified against SISO): https://forum.falcon-bms.com/topic/27846/helping-to-understand-link-16
- C2SIM standard overview SISO-STD-019-2020: https://cdn.ymaws.com/www.sisostandards.org/resource/resmgr/standards_products/siso-std-019-2020_c2sim.pdf

### Tertiary (LOW confidence, for additional context)
- STANAG 4676 overview: https://ieeexplore.ieee.org/document/4567745
- STANAG 4607 GMTI format (MITRE): https://www.mitre.org/sites/default/files/pdf/05_0164.pdf
