QUALITY_PROFILES = [
    {
        'name': '144p',
        'width': 256,
        'height': 144,
        'video_bitrate': '100k',
        'audio_bitrate': '32k',
        'maxrate': '150k',
        'bufsize': '200k',
        'profile': 'baseline',
        'level': '3.0'
    },
    {
        'name': '240p',
        'width': 426,
        'height': 240,
        'video_bitrate': '300k',
        'audio_bitrate': '48k',
        'maxrate': '450k',
        'bufsize': '600k',
        'profile': 'baseline',
        'level': '3.0'
    },
    {
        'name': '360p',
        'width': 640,
        'height': 360,
        'video_bitrate': '600k',
        'audio_bitrate': '64k',
        'maxrate': '900k',
        'bufsize': '1200k',
        'profile': 'baseline',
        'level': '3.1'
    },
    {
        'name': '480p',
        'width': 854,
        'height': 480,
        'video_bitrate': '1000k',
        'audio_bitrate': '96k',
        'maxrate': '1500k',
        'bufsize': '2000k',
        'profile': 'main',
        'level': '3.1'
    },
    {
        'name': '540p',
        'width': 960,
        'height': 540,
        'video_bitrate': '1500k',
        'audio_bitrate': '96k',
        'maxrate': '2250k',
        'bufsize': '3000k',
        'profile': 'main',
        'level': '4.0'
    },
    {
        'name': '720p',
        'width': 1280,
        'height': 720,
        'video_bitrate': '2500k',
        'audio_bitrate': '128k',
        'maxrate': '3750k',
        'bufsize': '5000k',
        'profile': 'main',
        'level': '4.0'
    },
    {
        'name': '720p60',
        'width': 1280,
        'height': 720,
        'video_bitrate': '3500k',
        'audio_bitrate': '128k',
        'maxrate': '5250k',
        'bufsize': '7000k',
        'profile': 'main',
        'level': '4.0',
        'fps': 60
    },
    {
        'name': '1080p',
        'width': 1920,
        'height': 1080,
        'video_bitrate': '5000k',
        'audio_bitrate': '192k',
        'maxrate': '7500k',
        'bufsize': '10000k',
        'profile': 'high',
        'level': '4.0'
    },
    {
        'name': '1080p60',
        'width': 1920,
        'height': 1080,
        'video_bitrate': '7500k',
        'audio_bitrate': '192k',
        'maxrate': '11250k',
        'bufsize': '15000k',
        'profile': 'high',
        'level': '4.2',
        'fps': 60
    },
    {
        'name': '1440p',
        'width': 2560,
        'height': 1440,
        'video_bitrate': '10000k',
        'audio_bitrate': '256k',
        'maxrate': '15000k',
        'bufsize': '20000k',
        'profile': 'high',
        'level': '5.0'
    },
    {
        'name': '2160p',
        'width': 3840,
        'height': 2160,
        'video_bitrate': '20000k',
        'audio_bitrate': '256k',
        'maxrate': '30000k',
        'bufsize': '40000k',
        'profile': 'high',
        'level': '5.1'
    }
]

GCS_INPUT_BUCKET = 'ode-islands-video-input'
GCS_OUTPUT_BUCKET = 'ode-islands-video-cdn'
