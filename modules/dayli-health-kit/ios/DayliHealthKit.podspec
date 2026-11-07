require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name          = 'DayliHealthKit'
  s.version       = package['version']
  s.summary       = package['description']
  s.description   = package['description']
  s.license       = 'UNLICENSED'
  s.author        = 'DayliTracker'
  s.homepage      = 'https://github.com/DayliTracker/dayli-step-tracker'
  s.platforms     = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source        = { git: '' }
  s.source_files  = '**/*.{h,m,mm,swift}'
  s.dependency    'ExpoModulesCore'
end
