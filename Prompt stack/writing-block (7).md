[SYS-SYS]
ROLE=MUSIC_AI_ENGINE
OBJECTIVE=PROVIDE_MODULAR_SELF_LEARNING_MODEL_SIGNALS

[MODELS]
Implement only where data/value justify:

AudioEmbedding
Mood
Genre
Energy
Tempo
Language
UserTaste
SessionIntent
TasteDrift
CollaborativeFiltering
ContentSimilarity
HybridRecommendation
Ranking
SkipPrediction
CompletionPrediction
Sequence
Transition
PlaylistGeneration
SourceReliability
WrongSource
MetadataQuality
DuplicateDetection.

Optional:
FaceExpression
VoiceContext.

[MODEL_RULE]
Model→Prediction→Confidence→Policy→Validation→Action.

[VERSION]
Track:
modelId
modelVersion
datasetVersion
featureVersion
metrics
status.

[CONFIDENCE]
Support:
HIGH
MEDIUM
LOW
UNKNOWN.

Low confidence→abstain/fallback.

[BASELINE]
Every complex model must outperform an appropriate baseline.

[TRAINING]
Validate:
duplicates
labels
missing data
future leakage
cross-user contamination
bot activity.

[DATA]
Separate:
train
validation
test.

Use temporal splits for behavioral prediction.

[FEEDBACK]
Separate:
shown
started
completed
liked
disliked
skipped.

[DRIFT]
Monitor:
data
feature
concept
catalog
user taste
provider.

[RETRAIN]
Trigger based on:
quality
drift
sufficient new data
catalog changes.

New model!=automatically better.

[DEPLOY]
OFFLINE
→SHADOW/CANARY
→MONITOR
→PROMOTE/ROLLBACK.

[SECURITY]
Models cannot:
change auth
change permissions
access credentials
rewrite production code
delete canonical data.

[AI_FAILURE]
Always provide deterministic/known-good fallback.

[FACE]
Optional, explicit opt-in, contextual only.
Never infer identity/medical/psychological/sensitive traits.

[NO]
No self-modifying production code.
No uncontrolled autonomous model deployment.